"use client";

import { useMemo, useState } from "react";
import { FlaskConical, LoaderCircle, ShieldAlert } from "lucide-react";
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
import {
  GuidedEntityMultiPicker,
  type GuidedOption,
} from "@/components/studio/guided-selectors";
import type { NjcPlusAccessData } from "@/components/studio/njc-plus-access-workspace";
import {
  accessDurationPresets,
  futureLocalDateTime,
  localDateTime,
  resolveAccessEnd,
  type AccessDurationPreset,
} from "@/lib/studio-guided-forms";
import {
  njcPlusInvitedBetaFeatures,
  type NjcPlusInvitedBetaFeature,
} from "@/lib/feature-flags";
import { njcPlusBetaDisclosure } from "@/lib/njc-plus-beta-contract";
import type { StudioAccountSummary } from "@/lib/studio-account-types";

type BetaGrant = NjcPlusAccessData["betaGrants"][number];
type BetaAction = "pause_invited_beta" | "resume_invited_beta" | "revoke_invited_beta";

const featureLabels: Record<NjcPlusInvitedBetaFeature, string> = {
  njc_plus_video: "Video",
  njc_plus_audio: "Audio",
  njc_plus_podcasts: "Podcasts",
  njc_plus_live: "Live coverage",
  njc_plus_search: "Search",
  njc_plus_comments: "Comments",
};

const featureOptions: GuidedOption[] = njcPlusInvitedBetaFeatures.map((feature) => ({
  value: feature,
  label: featureLabels[feature],
}));

function freshForm() {
  return {
    featureKeys: [] as NjcPlusInvitedBetaFeature[],
    premiumContentIncluded: false,
    contentIds: [] as string[],
    showMemberBranding: false,
    startsAt: localDateTime(new Date()),
    duration: "30_days" as AccessDurationPreset,
    customEndsAt: futureLocalDateTime(30),
    reason: "",
  };
}

export function NjcPlusBetaAccess({
  account,
  data,
  loading,
  reload,
  contentOptions,
}: {
  account: StudioAccountSummary;
  data: NjcPlusAccessData | null;
  loading: boolean;
  reload: () => Promise<void>;
  contentOptions: GuidedOption[];
}) {
  const [form, setForm] = useState(freshForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    grantId: string;
    action: BetaAction;
    reason: string;
  } | null>(null);

  const endsAt = useMemo(
    () => resolveAccessEnd(form.duration, form.customEndsAt, new Date(form.startsAt)),
    [form.customEndsAt, form.duration, form.startsAt],
  );
  const formReady = (
    form.featureKeys.length > 0 &&
    form.reason.trim().length >= 8 &&
    Boolean(endsAt) &&
    !Number.isNaN(new Date(form.startsAt).getTime()) &&
    Boolean(account.id)
  );

  async function submit() {
    if (!endsAt || !formReady) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/studio/njc-plus/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingId ? "update_invited_beta" : "grant_invited_beta",
          ...(editingId ? { grantId: editingId } : { userClerkId: account.id }),
          featureKeys: form.featureKeys,
          premiumContentIncluded: form.premiumContentIncluded,
          contentIds: form.premiumContentIncluded ? [] : form.contentIds,
          showMemberBranding: form.showMemberBranding,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt,
          reason: form.reason,
        }),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The invited beta action failed.");
      setMessage(`Invited Beta Tester access ${editingId ? "updated" : "granted"} without creating a membership.`);
      setEditingId(null);
      setForm(freshForm());
      setReviewOpen(false);
      await reload();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "The invited beta action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitStatus() {
    if (!pendingAction || pendingAction.reason.trim().length < 8) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/studio/njc-plus/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingAction),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The invited beta action failed.");
      setPendingAction(null);
      setMessage("Invited beta status updated and audited.");
      await reload();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "The invited beta action failed.");
    } finally {
      setBusy(false);
    }
  }

  function edit(grant: BetaGrant) {
    setEditingId(grant.id);
    setForm({
      featureKeys: grant.featureKeys.filter((key): key is NjcPlusInvitedBetaFeature =>
        njcPlusInvitedBetaFeatures.includes(key as NjcPlusInvitedBetaFeature)),
      premiumContentIncluded: grant.premiumContentIncluded,
      contentIds: grant.contentIds,
      showMemberBranding: grant.showMemberBranding,
      startsAt: localDateTime(new Date(grant.startsAt)),
      duration: "custom",
      customEndsAt: localDateTime(new Date(grant.endsAt)),
      reason: "",
    });
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <FlaskConical className="text-primary" />
          <CardTitle>Invited Beta Tester entitlement</CardTitle>
          <CardDescription>{njcPlusBetaDisclosure}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.betaCapacity.used} of ${data.betaCapacity.limit} temporary tester places are reserved.` : "Loading tester capacity…"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>Tester history</CardTitle>
            <CardDescription>Beta grants never become membership, trial, or complimentary-access records.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="animate-spin" /> Loading tester history…
              </p>
            ) : !data.betaGrants.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">This account has no invited beta history.</p>
            ) : (
              <div className="divide-y">
                {data.betaGrants.map((grant) => (
                  <article key={grant.id} className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <strong>Invited Beta Tester</strong>
                        <p className="text-sm text-muted-foreground">
                          {grant.featureKeys.map((key) => featureLabels[key as NjcPlusInvitedBetaFeature] ?? key).join(", ")}
                        </p>
                        <small>{new Date(grant.startsAt).toLocaleString()} → {new Date(grant.endsAt).toLocaleString()}</small>
                      </div>
                      <span className="capitalize">{grant.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Premium content: {grant.premiumContentIncluded ? "entire catalog" : grant.contentIds.length ? `${grant.contentIds.length} selected item(s)` : "not included"} ·
                      Member styling: {grant.showMemberBranding ? "shown" : "hidden"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={busy || ["revoked", "converted"].includes(grant.status)} onClick={() => edit(grant)}>Edit</Button>
                      {grant.status === "paused" ? (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setPendingAction({ grantId: grant.id, action: "resume_invited_beta", reason: "" })}>Resume</Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy || grant.status !== "active"} onClick={() => setPendingAction({ grantId: grant.id, action: "pause_invited_beta", reason: "" })}>Pause</Button>
                      )}
                      <Button size="sm" variant="destructive" disabled={busy || ["revoked", "converted"].includes(grant.status)} onClick={() => setPendingAction({ grantId: grant.id, action: "revoke_invited_beta", reason: "" })}>Revoke</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <ShieldAlert className="text-primary" />
            <CardTitle>{editingId ? "Edit temporary beta access" : "Invite this account"}</CardTitle>
            <CardDescription>Choose supported values below. The selected account is supplied automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Beta features">
              <GuidedEntityMultiPicker
                label="Beta features"
                values={form.featureKeys}
                options={featureOptions}
                onChange={(values) => setForm((current) => ({
                  ...current,
                  featureKeys: values as NjcPlusInvitedBetaFeature[],
                }))}
                placeholder="Choose beta features"
              />
            </Field>
            <ToggleField
              label="Include the full NJC+ premium catalog"
              checked={form.premiumContentIncluded}
              onChange={(checked) => setForm((current) => ({
                ...current,
                premiumContentIncluded: checked,
                contentIds: checked ? [] : current.contentIds,
              }))}
            />
            {!form.premiumContentIncluded ? (
              <Field label="Selected premium content (optional)">
                <GuidedEntityMultiPicker
                  label="Premium content"
                  values={form.contentIds}
                  options={contentOptions}
                  onChange={(contentIds) => setForm((current) => ({ ...current, contentIds }))}
                  placeholder="No individual content selected"
                />
              </Field>
            ) : null}
            <ToggleField
              label="Show NJC+ member styling"
              description="This changes presentation only. The account remains an Invited Beta Tester."
              checked={form.showMemberBranding}
              onChange={(showMemberBranding) => setForm((current) => ({ ...current, showMemberBranding }))}
            />
            <Field label="Access starts">
              <Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </Field>
            <Field label="Duration">
              <Select value={form.duration} onValueChange={(duration) => setForm((current) => ({ ...current, duration: duration as AccessDurationPreset }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accessDurationPresets.filter((preset) => preset.value !== "permanent").map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.duration === "custom" ? (
                <Input type="datetime-local" value={form.customEndsAt} onChange={(event) => setForm((current) => ({ ...current, customEndsAt: event.target.value }))} />
              ) : (
                <p className="text-xs text-muted-foreground">Ends {endsAt ? new Date(endsAt).toLocaleString() : "after a valid start date is selected"}.</p>
              )}
            </Field>
            <Field label="Required audit reason">
              <Input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Why this tester needs access" />
            </Field>
            <Button className="w-full" disabled={busy || loading || !formReady} onClick={() => setReviewOpen(true)}>
              Review {editingId ? "changes" : "invitation"}
            </Button>
            {editingId ? (
              <Button className="w-full" variant="outline" onClick={() => { setEditingId(null); setForm(freshForm()); }}>Cancel edit</Button>
            ) : null}
            {message ? <p className="text-xs" role="status">{message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review invited beta access</DialogTitle>
            <DialogDescription>Confirm the identity and temporary entitlement before it is audited.</DialogDescription>
          </DialogHeader>
          <ReviewRows rows={[
            ["Account", `${account.displayName}${account.primaryEmail ? ` · ${account.primaryEmail}` : ""}`],
            ["Entitlement", "Invited Beta Tester"],
            ["Features", form.featureKeys.map((key) => featureLabels[key]).join(", ")],
            ["Premium", form.premiumContentIncluded ? "Full catalog" : form.contentIds.length ? `${form.contentIds.length} selected item(s)` : "Not included"],
            ["Member branding", form.showMemberBranding ? "Shown (presentation only)" : "Hidden"],
            ["Starts", new Date(form.startsAt).toLocaleString()],
            ["Expires", endsAt ? new Date(endsAt).toLocaleString() : "Invalid"],
            ["Reason", form.reason],
          ]} />
          <DialogFooter showCloseButton>
            <Button disabled={busy || !formReady} onClick={() => void submit()}>
              {busy ? <LoaderCircle className="animate-spin" /> : null} Confirm temporary access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction ? betaActionLabel(pendingAction.action) : "Update beta access"}</DialogTitle>
            <DialogDescription>This updates only the separate temporary tester entitlement.</DialogDescription>
          </DialogHeader>
          {pendingAction ? (
            <Field label="Required audit reason">
              <Input value={pendingAction.reason} onChange={(event) => setPendingAction((current) => current ? { ...current, reason: event.target.value } : null)} />
            </Field>
          ) : null}
          <DialogFooter showCloseButton>
            <Button
              variant={pendingAction?.action === "revoke_invited_beta" ? "destructive" : "default"}
              disabled={busy || !pendingAction || pendingAction.reason.trim().length < 8}
              onClick={() => void submitStatus()}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : null} Confirm update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="block space-y-2"><span>{label}</span>{children}</Label>;
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
      <span><span className="block font-medium">{label}</span>{description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}</span>
    </Label>
  );
}

function ReviewRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="divide-y rounded-lg border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 p-3 sm:grid-cols-[8rem_1fr]">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function betaActionLabel(action: BetaAction) {
  if (action === "pause_invited_beta") return "Pause invited beta access";
  if (action === "resume_invited_beta") return "Resume invited beta access";
  return "Revoke invited beta access";
}
