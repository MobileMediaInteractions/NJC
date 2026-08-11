"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileArchive, MessageSquareText, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Asset = { id: string; title: string; description: string; category: string; visibility: string; active: boolean };
type Detail = {
  request: { id: string; status: string; profile: Record<string, unknown>; decision: { reasons: string[]; restrictions: string[]; policyVersion: string | null }; createdAt: string; updatedAt: string };
  messages: Array<{ id: string; role: string; content: string; model: string | null; structuredOutput: Record<string, unknown> | null; createdAt: string }>;
  requestAssets: Array<{ link: { assetId: string; decision: string; reason: string | null }; asset: Asset }>;
  package: { id: string; status: string; filename: string | null; size: number | null; expiresAt: string; downloadCount: number; manifest: Record<string, unknown> } | null;
  audit: Array<{ id: string; actorType: string; action: string; metadata: Record<string, unknown>; createdAt: string }>;
};

export function PressRequestReview({ requestId }: { requestId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [catalog, setCatalog] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [requestResponse, catalogResponse] = await Promise.all([
      fetch(`/api/v1/studio/press-kit/requests/${requestId}`),
      fetch("/api/v1/studio/press-kit/assets"),
    ]);
    if (!requestResponse.ok) { setNotice("The press request could not be loaded."); setBusy(false); return; }
    const payload = await requestResponse.json();
    const catalogPayload = catalogResponse.ok ? await catalogResponse.json() : { assets: [] };
    setDetail(payload); setCatalog(catalogPayload.assets ?? []);
    setSelected(payload.requestAssets.filter((item: Detail["requestAssets"][number]) => item.link.decision !== "rejected").map((item: Detail["requestAssets"][number]) => item.asset.id));
    setBusy(false);
  }, [requestId]);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const profile = detail?.request.profile ?? {};
  const concerns = useMemo(() => detail?.messages.flatMap((message) => {
    const values = message.structuredOutput?.concerns;
    return Array.isArray(values) ? values.filter((item): item is string => typeof item === "string" && item !== "none") : [];
  }) ?? [], [detail]);

  async function decide(action: "approve" | "partially_approve" | "deny" | "request_information" | "revoke") {
    if (note.trim().length < 5) return setNotice("Add a review note describing the decision.");
    setBusy(true); setNotice("");
    const response = await fetch(`/api/v1/studio/press-kit/requests/${requestId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, approvedAssetIds: selected, reviewerNote: note }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setNotice(payload.error?.message ?? "The decision could not be saved.");
    else { setNotice(action === "approve" || action === "partially_approve" ? "Decision saved and secure package generated." : "Decision saved."); await load(); }
    setBusy(false);
  }
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  if (busy && !detail) return <Card><CardContent className="flex items-center gap-3 py-14 text-sm text-muted-foreground"><Clock3 className="size-4 animate-pulse" /> Loading audited request…</CardContent></Card>;
  if (!detail) return <Card><CardHeader><CardTitle>Request unavailable</CardTitle><CardDescription>{notice || "The request could not be found."}</CardDescription></CardHeader></Card>;
  return <div>
    <Link href="/studio/press" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Press requests</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Request {detail.request.id.slice(0, 8)}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{String(profile.organization || profile.name || "Press request")}</h1><p className="mt-2 text-sm text-muted-foreground">Submitted {new Date(detail.request.createdAt).toLocaleString()}</p></div><Badge variant={detail.request.status === "manual_review" ? "destructive" : "secondary"} className="capitalize">{detail.request.status.replaceAll("_", " ")}</Badge></div>
    {concerns.length ? <Card className="mt-6 border-amber-500/40 bg-amber-500/5"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4 text-amber-600" /> Verification concerns</CardTitle><CardDescription>{[...new Set(concerns)].map((item) => item.replaceAll("_", " ")).join(" · ")}. These labels never authorize or deny a file by themselves.</CardDescription></CardHeader></Card> : null}
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
      <div className="space-y-5"><Card><CardHeader><CardTitle>Confirmed brief</CardTitle><CardDescription>Identity and purpose supplied by the requester. Verify externally when appropriate.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{Object.entries({ Requester: profile.name, Organization: profile.organization, Role: profile.requesterRole, Email: profile.email, Country: profile.country, Project: profile.projectName, "Use classification": profile.usageClassification, "Expected release": profile.expectedReleaseAt }).map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm">{String(value || "Not supplied")}</p></div>)}<div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intended use</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{String(profile.requestDetails || "Not supplied")}</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where it will appear</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{String(profile.whereUsed || "Not supplied")}</p></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="size-4" /> Intake transcript</CardTitle><CardDescription>Requester text remains untrusted. Structured extraction is evidence, not authorization.</CardDescription></CardHeader><CardContent className="space-y-3">{detail.messages.map((message) => <div key={message.id} className={`rounded-lg border p-4 ${message.role === "requester" ? "bg-muted/30" : "border-primary/20"}`}><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{message.role} {message.model ? `· ${message.model}` : ""}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Audit history</CardTitle><CardDescription>Policy, staff, package, and download events retained without raw IP addresses.</CardDescription></CardHeader><CardContent className="space-y-3">{detail.audit.map((event) => <div key={event.id} className="flex gap-3 border-b pb-3 last:border-0"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div><p className="text-sm font-medium">{event.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{event.actorType} · {new Date(event.createdAt).toLocaleString()}</p></div></div>)}</CardContent></Card></div>
      <div className="space-y-5"><Card><CardHeader><CardTitle>Asset decision</CardTitle><CardDescription>Select the exact active catalog IDs permitted for this request. Restricted and private assets always require this manual path.</CardDescription></CardHeader><CardContent className="space-y-3">{catalog.map((asset) => <label key={asset.id} className={`block rounded-lg border p-4 ${selected.includes(asset.id) ? "border-primary bg-primary/5" : ""} ${!asset.active ? "opacity-45" : "cursor-pointer"}`}><span className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={selected.includes(asset.id)} disabled={!asset.active || busy} onChange={() => toggle(asset.id)} /><span><strong className="text-sm">{asset.title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{asset.description}</span><span className="mt-2 block text-[10px] uppercase tracking-wide text-muted-foreground">{asset.category} · {asset.visibility}</span></span></span></label>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Record a decision</CardTitle><CardDescription>The note is part of the audit record and may be shown to the requester as the reason.</CardDescription></CardHeader><CardContent><Textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-28" placeholder="Explain the authorization, exclusion, missing detail, denial, or revocation…" />{notice ? <p className="mt-3 rounded-md bg-muted p-3 text-xs">{notice}</p> : null}<div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={() => decide("approve")} disabled={busy || !selected.length}><CheckCircle2 /> Approve selected</Button><Button variant="outline" onClick={() => decide("partially_approve")} disabled={busy || !selected.length}><FileArchive /> Partial approval</Button><Button variant="outline" onClick={() => decide("request_information")} disabled={busy}><MessageSquareText /> Request information</Button><Button variant="destructive" onClick={() => decide("deny")} disabled={busy}><XCircle /> Deny request</Button>{["ready", "downloaded"].includes(detail.request.status) ? <Button variant="destructive" className="sm:col-span-2" onClick={() => decide("revoke")} disabled={busy}><ShieldAlert /> Revoke package and authorization</Button> : null}</div></CardContent></Card>
        {detail.package ? <Card><CardHeader><CardTitle>Generated package</CardTitle></CardHeader><CardContent className="text-sm"><p className="font-medium">{detail.package.filename || "Package pending"}</p><p className="mt-2 text-muted-foreground">{detail.package.status} · {detail.package.size ? `${(detail.package.size / 1_000_000).toFixed(2)} MB` : "size pending"} · {detail.package.downloadCount} downloads</p><p className="mt-1 text-xs text-muted-foreground">Expires {new Date(detail.package.expiresAt).toLocaleString()}</p></CardContent></Card> : null}
      </div>
    </div>
  </div>;
}
