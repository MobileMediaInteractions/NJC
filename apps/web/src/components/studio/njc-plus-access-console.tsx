"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, ShieldPlus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GuidedEntityPicker, type GuidedOption } from "@/components/studio/guided-selectors";
import type { NjcPlusAccessData } from "@/components/studio/njc-plus-access-workspace";
import {
  accessDurationPresets,
  initialScopeId,
  resolveAccessEnd,
  type AccessDurationPreset,
} from "@/lib/studio-guided-forms";
import type { StudioAccountSummary } from "@/lib/studio-account-types";

type ScopeType = "product" | "tier" | "content";
type GrantSource = "manual" | "trial" | "promotion" | "complimentary";
type EntitlementAction = "revoke_access" | "pause_access" | "resume_access" | "adjust_access";

const grantSourceLabels: Record<GrantSource, string> = {
  manual: "Manual administrative grant",
  trial: "NJC+ trial",
  promotion: "Promotion",
  complimentary: "Complimentary NJC+",
};

const emptyGrant = {
  scopeType: "product" as ScopeType,
  scopeId: "njc_plus",
  sourceType: "manual" as GrantSource,
  duration: "permanent" as AccessDurationPreset,
  customEndsAt: "",
  reason: "",
};

const emptyCredit = {
  amount: 0,
  transactionType: "grant",
  duration: "permanent" as AccessDurationPreset,
  customExpiresAt: "",
  reason: "",
};

export function NjcPlusAccessConsole({
  mode,
  account,
  data,
  loading,
  reload,
  tierOptions,
  contentOptions,
}: {
  mode: "access" | "credits";
  account: StudioAccountSummary;
  data: NjcPlusAccessData | null;
  loading: boolean;
  reload: () => Promise<void>;
  tierOptions: GuidedOption[];
  contentOptions: GuidedOption[];
}) {
  const [grant, setGrant] = useState(emptyGrant);
  const [credit, setCredit] = useState(emptyCredit);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    entitlementId: string;
    action: EntitlementAction;
    reason: string;
    duration: AccessDurationPreset;
    customEndsAt: string;
  } | null>(null);

  const scopeOptions = grant.scopeType === "tier" ? tierOptions : contentOptions;
  const selectedScope = useMemo(
    () => scopeOptions.find((option) => option.value === grant.scopeId),
    [grant.scopeId, scopeOptions],
  );
  const grantEnd = resolveAccessEnd(grant.duration, grant.customEndsAt);
  const creditEnd = resolveAccessEnd(credit.duration, credit.customExpiresAt);
  const grantReady = grant.reason.trim().length >= 8 &&
    Boolean(grant.scopeId) &&
    (grant.duration !== "custom" || Boolean(grantEnd));
  const creditReady = credit.amount !== 0 &&
    credit.reason.trim().length >= 8 &&
    (credit.duration !== "custom" || Boolean(creditEnd));

  async function submit(body: object, successMessage: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/studio/njc-plus/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The NJC+ action failed");
      setMessage(successMessage);
      await reload();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The NJC+ action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmGrant() {
    const completed = await submit({
      action: "grant_access",
      userClerkId: account.id,
      scopeType: grant.scopeType,
      scopeId: grant.scopeId,
      sourceType: grant.sourceType,
      endsAt: grantEnd,
      reason: grant.reason,
    }, "Access granted and added to the NJC+ audit log.");
    if (completed) {
      setGrant(emptyGrant);
      setReviewOpen(false);
    }
  }

  async function recordCredit() {
    const completed = await submit({
      action: "credit_transaction",
      userClerkId: account.id,
      amount: credit.amount,
      transactionType: credit.transactionType,
      reason: credit.reason,
      expiresAt: creditEnd,
      idempotencyKey: crypto.randomUUID(),
    }, "Credit transaction recorded and audited.");
    if (completed) setCredit(emptyCredit);
  }

  async function submitEntitlementAction() {
    if (!pendingAction) return;
    const body = pendingAction.action === "adjust_access"
      ? {
          action: pendingAction.action,
          entitlementId: pendingAction.entitlementId,
          endsAt: resolveAccessEnd(pendingAction.duration, pendingAction.customEndsAt),
          reason: pendingAction.reason,
        }
      : {
          action: pendingAction.action,
          entitlementId: pendingAction.entitlementId,
          reason: pendingAction.reason,
        };
    const completed = await submit(body, "Entitlement updated and audited.");
    if (completed) setPendingAction(null);
  }

  function changeScope(scopeType: ScopeType) {
    setGrant((current) => ({
      ...current,
      scopeType,
      scopeId: initialScopeId(scopeType),
    }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "credits" ? "Access Credit ledger" : "Entitlements"}</CardTitle>
          <CardDescription>
            {mode === "credits"
              ? `Computed balance: ${data?.balance?.toLocaleString() ?? "—"} credits. The balance is never stored independently.`
              : `${data?.entitlements.length ?? 0} access record(s), including expired or revoked history.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" /> Refreshing history…</p> : null}
          {!loading && mode === "credits" ? (
            data?.ledger.length ? <div className="divide-y">{data.ledger.map((row) => (
              <div key={row.id} className="grid grid-cols-[auto_1fr_auto] gap-3 py-3">
                <strong className={row.amount >= 0 ? "text-emerald-500" : "text-destructive"}>{row.amount >= 0 ? "+" : ""}{row.amount}</strong>
                <span><span className="block capitalize">{row.transactionType}</span><small className="text-muted-foreground">{row.reason}</small></span>
                <small>{new Date(row.createdAt).toLocaleDateString()}</small>
              </div>
            ))}</div> : <EmptyHistory text="No credit transactions for this account." />
          ) : null}
          {!loading && mode === "access" ? (
            data?.entitlements.length ? <div className="divide-y">{data.entitlements.map((row) => (
              <div key={row.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <strong>{scopeLabel(row.scopeType, row.scopeId, tierOptions, contentOptions)}</strong>
                    <small className="block text-muted-foreground">{grantSourceLabels[row.sourceType as GrantSource] ?? row.sourceType} · {new Date(row.startsAt).toLocaleDateString()}{row.endsAt ? ` → ${new Date(row.endsAt).toLocaleDateString()}` : " · permanent"}</small>
                  </span>
                  <span className="capitalize">{row.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy || row.status === "revoked"} onClick={() => setPendingAction({ entitlementId: row.id, action: "adjust_access", reason: "", duration: row.endsAt ? "custom" : "permanent", customEndsAt: row.endsAt ? localInput(row.endsAt) : "" })}>Change expiration</Button>
                  {row.status === "paused"
                    ? <Button size="sm" variant="outline" disabled={busy} onClick={() => setPendingAction({ entitlementId: row.id, action: "resume_access", reason: "", duration: "permanent", customEndsAt: "" })}>Resume</Button>
                    : <Button size="sm" variant="outline" disabled={busy || row.status !== "active"} onClick={() => setPendingAction({ entitlementId: row.id, action: "pause_access", reason: "", duration: "permanent", customEndsAt: "" })}>Pause</Button>}
                  <Button size="sm" variant="destructive" disabled={busy || row.status === "revoked"} onClick={() => setPendingAction({ entitlementId: row.id, action: "revoke_access", reason: "", duration: "permanent", customEndsAt: "" })}>Revoke</Button>
                </div>
              </div>
            ))}</div> : <EmptyHistory text="No NJC+ entitlement history for this account." />
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          {mode === "credits" ? <WalletCards className="text-primary" /> : <ShieldPlus className="text-primary" />}
          <CardTitle>{mode === "credits" ? "Record credit transaction" : "Grant access"}</CardTitle>
          <CardDescription>Known accounts and resources are selected; only the required editorial audit reason is typed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "credits" ? (
            <>
              <Field label="Signed amount"><Input type="number" value={credit.amount} onChange={(event) => setCredit((current) => ({ ...current, amount: Number(event.target.value) }))} /></Field>
              <Field label="Transaction type">
                <Select value={credit.transactionType} onValueChange={(transactionType) => setCredit((current) => ({ ...current, transactionType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["grant", "deduction", "expiration", "refund", "correction", "reversal"].map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <DurationField value={credit.duration} customValue={credit.customExpiresAt} onPresetChange={(duration) => setCredit((current) => ({ ...current, duration }))} onCustomChange={(customExpiresAt) => setCredit((current) => ({ ...current, customExpiresAt }))} />
              <Field label="Audit reason"><Input value={credit.reason} onChange={(event) => setCredit((current) => ({ ...current, reason: event.target.value }))} placeholder="Why this ledger transaction is required" /></Field>
              <Button className="w-full" disabled={busy || !creditReady} onClick={() => void recordCredit()}>{busy ? <LoaderCircle className="animate-spin" /> : null} Record transaction</Button>
            </>
          ) : (
            <>
              <Field label="Scope">
                <Select value={grant.scopeType} onValueChange={(scopeType) => changeScope(scopeType as ScopeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Whole NJC+</SelectItem>
                    <SelectItem value="tier">Specific tier</SelectItem>
                    <SelectItem value="content">Individual content</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {grant.scopeType !== "product" ? (
                <Field label={grant.scopeType === "tier" ? "Tier" : "Content"}>
                  <GuidedEntityPicker
                    label={grant.scopeType === "tier" ? "NJC+ tier" : "NJC+ content"}
                    value={grant.scopeId || null}
                    options={scopeOptions}
                    onChange={(scopeId) => setGrant((current) => ({ ...current, scopeId: scopeId ?? "" }))}
                    placeholder={`Choose ${grant.scopeType}`}
                    allowClear={false}
                  />
                </Field>
              ) : (
                <div className="rounded-md border bg-muted/30 p-3 text-sm"><strong>Whole NJC+</strong><p className="mt-1 text-xs text-muted-foreground">Product scope is populated automatically.</p></div>
              )}
              <Field label="Grant type">
                <Select value={grant.sourceType} onValueChange={(sourceType) => setGrant((current) => ({ ...current, sourceType: sourceType as GrantSource }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(grantSourceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <DurationField value={grant.duration} customValue={grant.customEndsAt} onPresetChange={(duration) => setGrant((current) => ({ ...current, duration }))} onCustomChange={(customEndsAt) => setGrant((current) => ({ ...current, customEndsAt }))} />
              <Field label="Audit reason"><Input value={grant.reason} onChange={(event) => setGrant((current) => ({ ...current, reason: event.target.value }))} placeholder="Why this access is being granted" /></Field>
              <Button className="w-full" disabled={busy || !grantReady} onClick={() => setReviewOpen(true)}>Review grant</Button>
            </>
          )}
          {message ? <p className="rounded-md border p-3 text-xs" role="status">{message}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review NJC+ access grant</DialogTitle>
            <DialogDescription>Confirm the resolved account and access effect before writing an auditable entitlement.</DialogDescription>
          </DialogHeader>
          <ReviewRows rows={[
            ["Account", `${account.displayName}${account.primaryEmail ? ` · ${account.primaryEmail}` : ""}`],
            ["Entitlement", grantSourceLabels[grant.sourceType]],
            ["Scope", grant.scopeType === "product" ? "Whole NJC+" : selectedScope?.label ?? "No valid scope selected"],
            ["Expiration", grantEnd ? new Date(grantEnd).toLocaleString() : "No expiration"],
            ["Beta effect", grant.scopeType === "content" ? "Separate invited-beta status is preserved" : "Any active invited-beta grant converts to this access type"],
            ["Audit reason", grant.reason],
          ]} />
          <DialogFooter showCloseButton>
            <Button onClick={() => void confirmGrant()} disabled={busy || !grantReady}>{busy ? <LoaderCircle className="animate-spin" /> : null} Confirm grant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction ? actionLabel(pendingAction.action) : "Update entitlement"}</DialogTitle>
            <DialogDescription>Changes are appended to the immutable NJC+ audit history.</DialogDescription>
          </DialogHeader>
          {pendingAction ? <div className="space-y-4">
            {pendingAction.action === "adjust_access" ? (
              <DurationField value={pendingAction.duration} customValue={pendingAction.customEndsAt} onPresetChange={(duration) => setPendingAction((current) => current ? { ...current, duration } : null)} onCustomChange={(customEndsAt) => setPendingAction((current) => current ? { ...current, customEndsAt } : null)} />
            ) : null}
            <Field label="Required audit reason"><Input value={pendingAction.reason} onChange={(event) => setPendingAction((current) => current ? { ...current, reason: event.target.value } : null)} /></Field>
          </div> : null}
          <DialogFooter showCloseButton>
            <Button variant={pendingAction?.action === "revoke_access" ? "destructive" : "default"} disabled={busy || !pendingAction || pendingAction.reason.trim().length < 8 || (pendingAction.action === "adjust_access" && pendingAction.duration === "custom" && !resolveAccessEnd("custom", pendingAction.customEndsAt))} onClick={() => void submitEntitlementAction()}>
              {busy ? <LoaderCircle className="animate-spin" /> : null} Confirm update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DurationField({
  value,
  customValue,
  onPresetChange,
  onCustomChange,
}: {
  value: AccessDurationPreset;
  customValue: string;
  onPresetChange: (value: AccessDurationPreset) => void;
  onCustomChange: (value: string) => void;
}) {
  return (
    <Field label="Duration">
      <Select value={value} onValueChange={(preset) => onPresetChange(preset as AccessDurationPreset)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{accessDurationPresets.map((preset) => <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>)}</SelectContent>
      </Select>
      {value === "custom" ? <Input type="datetime-local" value={customValue} onChange={(event) => onCustomChange(event.target.value)} aria-label="Custom expiration date and time" /> : null}
    </Field>
  );
}

function ReviewRows({ rows }: { rows: Array<[string, string]> }) {
  return <dl className="divide-y rounded-lg border">{rows.map(([label, value]) => <div key={label} className="grid gap-1 p-3 sm:grid-cols-[8rem_1fr]"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="text-sm">{value}</dd></div>)}</dl>;
}

function EmptyHistory({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="block space-y-2"><span>{label}</span>{children}</Label>;
}

function scopeLabel(scopeType: string, scopeId: string, tiers: GuidedOption[], content: GuidedOption[]) {
  if (scopeType === "product") return "Whole NJC+";
  const option = (scopeType === "tier" ? tiers : content).find((item) => item.value === scopeId);
  return option?.label ?? `${scopeType}: ${scopeId}`;
}

function actionLabel(action: EntitlementAction) {
  if (action === "adjust_access") return "Change access expiration";
  if (action === "pause_access") return "Pause access";
  if (action === "resume_access") return "Resume access";
  return "Revoke access";
}

function localInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
