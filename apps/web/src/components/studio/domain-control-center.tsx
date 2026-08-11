"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CloudCog, Copy, KeyRound, Loader2, LockKeyhole, Network, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { managedDomainCatalog, type ManagedDomainLabel } from "@/lib/domain-registry";

type DomainStatus = (typeof managedDomainCatalog)[number] & {
  hostname: string;
  attached: boolean | null;
  verified: boolean | null;
  cname: string[];
  provisionable: boolean;
};

type Readiness = {
  enabled: boolean;
  operator: boolean;
  database: boolean;
  challengeSecret: boolean;
  vercel: boolean;
  automatedDns: boolean;
  fullyAutomated: boolean;
};

type Preview = {
  hostname: string;
  challenge: string;
  challengeExpiresInSeconds: number;
  confirmation: string;
  automatedDns: boolean;
  operations: string[];
};

const initialDomains: DomainStatus[] = managedDomainCatalog.map((entry) => ({
  ...entry,
  hostname: `${entry.label}.thejerseycourier.com`,
  attached: null,
  verified: null,
  cname: [],
  provisionable: entry.project === "web" && entry.activation !== "active",
}));

function statusLabel(domain: DomainStatus) {
  if (domain.activation === "security-gated") return "Perimeter required";
  if (domain.activation === "reserved" && !domain.cname.length) return "Reserved";
  if (domain.cname.length && domain.attached !== false) return "Live DNS";
  if (domain.attached) return "Awaiting DNS";
  if (domain.activation === "required") return "Required";
  return "Not active";
}

export function DomainControlCenter({ canOperate }: { canOperate: boolean }) {
  const [domains, setDomains] = useState<DomainStatus[]>(initialDomains);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [selected, setSelected] = useState<ManagedDomainLabel>("press");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"loading" | "preview" | "provision" | null>(null);

  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.label === selected) ?? domains[0],
    [domains, selected],
  );

  async function load() {
    if (!canOperate) return;
    setBusy("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/v1/studio/domains", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Domain status could not be loaded");
      setDomains(result.data.domains);
      setReadiness(result.data.readiness);
      if (result.data.providerError) setMessage(`Provider status warning: ${result.data.providerError}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Domain status could not be loaded");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!canOperate) return;
    let cancelled = false;
    void fetch("/api/v1/studio/domains", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "Domain status could not be loaded");
        return result;
      })
      .then((result) => {
        if (cancelled) return;
        setDomains(result.data.domains);
        setReadiness(result.data.readiness);
        if (result.data.providerError) setMessage(`Provider status warning: ${result.data.providerError}`);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Domain status could not be loaded");
      });
    return () => { cancelled = true; };
  }, [canOperate]);

  async function createPreview() {
    setBusy("preview");
    setMessage(null);
    setPreview(null);
    setConfirmation("");
    try {
      const response = await fetch("/api/v1/studio/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", label: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The provisioning preview could not be created");
      setPreview(result.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The provisioning preview could not be created");
    } finally {
      setBusy(null);
    }
  }

  async function provision() {
    if (!preview) return;
    setBusy("provision");
    setMessage(null);
    try {
      const response = await fetch("/api/v1/studio/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provision", label: selected, challenge: preview.challenge, confirmation, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Domain provisioning failed");
      const suffix = result.data.dnsAutomated
        ? "DNS propagation and TLS issuance are now being verified."
        : `Vercel is attached. Create CNAME ${selected} → ${result.data.cnameTarget} at the authoritative DNS provider.`;
      setMessage(`${result.data.hostname} was accepted. ${suffix}`);
      setPreview(null);
      setConfirmation("");
      setReason("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Domain provisioning failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-[#d5a341]/35">
        <CardHeader className="bg-[#08221a] text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#d5a341]">Restricted infrastructure</p>
              <CardTitle className="mt-2 flex items-center gap-2 text-white"><Network className="size-5" /> Domain control center</CardTitle>
              <CardDescription className="max-w-3xl text-white/60">A two-phase, allowlisted provisioning workflow. It cannot remove domains, edit arbitrary DNS, publish the internal boundary, or expose provider credentials.</CardDescription>
            </div>
            <Badge variant="outline" className="border-white/25 text-white">Super-admin operator only</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
          <ReadinessItem label="Explicit operator" ready={canOperate && (readiness?.operator ?? false)} />
          <ReadinessItem label="Durable audit database" ready={readiness?.database ?? false} />
          <ReadinessItem label="Signed five-minute preview" ready={readiness?.challengeSecret ?? false} />
          <ReadinessItem label="Fixed Vercel project" ready={readiness?.vercel ?? false} />
          <ReadinessItem label="Automated authoritative DNS" ready={readiness?.automatedDns ?? false} optional />
          <ReadinessItem label="Production release switch" ready={readiness?.enabled ?? false} />
        </CardContent>
      </Card>

      {!canOperate ? (
        <Card><CardContent className="flex items-start gap-4 p-6"><LockKeyhole className="mt-0.5 size-5 text-amber-600" /><div><p className="font-semibold">This account is not a domain-control operator.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Administrator role alone is intentionally insufficient. An explicit server-side operator allowlist, durable audit storage and provider configuration are all required.</p></div></CardContent></Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div><CardTitle>Hostname registry</CardTitle><CardDescription>Current production hosts, required activations, security-gated infrastructure and intentionally dormant future reservations.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={!canOperate || busy !== null}><RefreshCw className={busy === "loading" ? "animate-spin" : ""} /> Refresh</Button>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {domains.map((domain) => (
            <div key={domain.hostname} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{domain.title}</p><Badge variant={domain.cname.length ? "secondary" : "outline"}>{statusLabel(domain)}</Badge></div>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{domain.hostname}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{domain.purpose}</p>
              </div>
              <div className="text-right text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <p>{domain.project} project</p>
                <p className="mt-1">{domain.cname.length ? domain.cname.join(", ") : "No public CNAME"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CloudCog className="size-5" /> Provision an approved hostname</CardTitle><CardDescription>Only repository-approved web hostnames are selectable. The internal boundary, CDN and external status service are excluded from this control.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="domain-purpose">Approved purpose</Label><select id="domain-purpose" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selected} disabled={!canOperate || busy !== null} onChange={(event) => { setSelected(event.target.value as ManagedDomainLabel); setPreview(null); setConfirmation(""); }}><option value="">Select a hostname</option>{domains.filter((domain) => domain.provisionable).map((domain) => <option key={domain.label} value={domain.label}>{domain.hostname} — {domain.title}</option>)}</select></div>
            <div className="rounded-lg border bg-muted/25 p-4"><p className="text-xs font-black uppercase tracking-[0.12em]">Selected result</p><p className="mt-2 font-mono text-sm">{selectedDomain?.hostname}</p><p className="mt-2 text-xs text-muted-foreground">{selectedDomain?.purpose}</p></div>
          </div>
          <Button onClick={() => void createPreview()} disabled={!canOperate || !selectedDomain?.provisionable || busy !== null}>{busy === "preview" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Create signed preview</Button>

          {preview ? <div className="space-y-5 rounded-xl border border-amber-500/35 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" /><div><p className="font-semibold">Production infrastructure change</p><p className="mt-1 text-sm leading-6 text-muted-foreground">This five-minute preview is bound to your account and {preview.hostname}. It attaches only to the fixed NJC project. {preview.automatedDns ? "The authoritative CNAME will also be reconciled automatically." : "DNS will not change automatically; the returned CNAME must be applied separately."}</p></div></div>
            <ol className="grid gap-2 text-sm text-muted-foreground">{preview.operations.map((operation, index) => <li key={operation} className="flex gap-3"><span className="font-mono text-primary">{index + 1}.</span>{operation}</li>)}</ol>
            <div className="space-y-2"><Label htmlFor="domain-reason">Operational reason</Label><Textarea id="domain-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this hostname is needed and who owns the resulting service." className="min-h-24" /></div>
            <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="domain-confirmation">Exact confirmation</Label><Button type="button" size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(preview.confirmation)}><Copy /> Copy phrase</Button></div><Input id="domain-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} placeholder={preview.confirmation} /></div>
            <Button variant="destructive" onClick={() => void provision()} disabled={busy !== null || reason.trim().length < 20 || confirmation !== preview.confirmation}>{busy === "provision" ? <Loader2 className="animate-spin" /> : <KeyRound />} Provision {preview.hostname}</Button>
          </div> : null}

          {message ? <p role="status" className="rounded-lg border bg-muted/30 p-4 text-sm leading-6">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ReadinessItem({ label, ready, optional = false }: { label: string; ready: boolean; optional?: boolean }) {
  return <div className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm"><span className={ready ? "text-emerald-600" : optional ? "text-muted-foreground" : "text-amber-600"}>{ready ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}</span><span className="font-medium">{label}</span>{optional ? <Badge variant="outline" className="ml-auto">Optional</Badge> : null}</div>;
}
