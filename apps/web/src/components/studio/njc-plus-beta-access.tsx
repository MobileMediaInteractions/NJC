"use client";

import { useState } from "react";
import { FlaskConical, LoaderCircle, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  njcPlusInvitedBetaFeatures,
  type NjcPlusInvitedBetaFeature,
} from "@/lib/feature-flags";
import { njcPlusBetaDisclosure } from "@/lib/njc-plus-beta-contract";

type BetaGrant = {
  id: string;
  status: string;
  featureKeys: string[];
  premiumContentIncluded: boolean;
  contentIds: string[];
  showMemberBranding: boolean;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type AccessResponse = {
  betaGrants: BetaGrant[];
  betaCapacity: { used: number; limit: number };
};

const featureLabels: Record<NjcPlusInvitedBetaFeature, string> = {
  njc_plus_video: "Video",
  njc_plus_audio: "Audio",
  njc_plus_podcasts: "Podcasts",
  njc_plus_live: "Live coverage",
  njc_plus_search: "Search",
  njc_plus_comments: "Comments",
};

const emptyForm = {
  featureKeys: [] as NjcPlusInvitedBetaFeature[],
  premiumContentIncluded: false,
  contentIds: "",
  showMemberBranding: false,
  startsAt: "",
  endsAt: "",
  reason: "",
};

export function NjcPlusBetaAccess() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<AccessResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function lookup() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/v1/studio/njc-plus/access?userClerkId=${encodeURIComponent(userId)}`);
    const payload = await response.json() as { data?: AccessResponse; error?: { message?: string } };
    setData(payload.data ?? null);
    setMessage(payload.error?.message ?? "");
    setBusy(false);
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    const contentIds = form.contentIds.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
    const response = await fetch("/api/v1/studio/njc-plus/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: editingId ? "update_invited_beta" : "grant_invited_beta",
        ...(editingId ? { grantId: editingId } : { userClerkId: userId }),
        ...form,
        contentIds,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      }),
    });
    const payload = await response.json() as { error?: { message?: string } };
    setMessage(response.ok
      ? `Invited Beta Tester access ${editingId ? "updated" : "granted"} without creating a membership.`
      : payload.error?.message ?? "The invited beta action failed.");
    setBusy(false);
    if (response.ok) {
      setEditingId(null);
      setForm(emptyForm);
      await lookup();
    }
  }

  async function changeStatus(grantId: string, action: "pause_invited_beta" | "resume_invited_beta" | "revoke_invited_beta") {
    const reason = window.prompt("Enter the required audit reason:");
    if (!reason) return;
    if (action === "revoke_invited_beta" && !window.confirm("Revoke this temporary beta entitlement now? This does not affect any separate subscription.")) return;
    setBusy(true);
    const response = await fetch("/api/v1/studio/njc-plus/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, grantId, reason }),
    });
    const payload = await response.json() as { error?: { message?: string } };
    setMessage(response.ok ? "Invited beta status updated and audited." : payload.error?.message ?? "The invited beta action failed.");
    setBusy(false);
    if (response.ok) await lookup();
  }

  function edit(grant: BetaGrant) {
    setEditingId(grant.id);
    setForm({
      featureKeys: grant.featureKeys.filter((key): key is NjcPlusInvitedBetaFeature =>
        njcPlusInvitedBetaFeatures.includes(key as NjcPlusInvitedBetaFeature)),
      premiumContentIncluded: grant.premiumContentIncluded,
      contentIds: grant.contentIds.join(", "),
      showMemberBranding: grant.showMemberBranding,
      startsAt: toLocalInput(grant.startsAt),
      endsAt: toLocalInput(grant.endsAt),
      reason: "",
    });
  }

  const validDates = form.startsAt && form.endsAt &&
    !Number.isNaN(new Date(form.startsAt).getTime()) &&
    !Number.isNaN(new Date(form.endsAt).getTime());

  return <section className="mt-8 space-y-6">
    <Card>
      <CardHeader>
        <FlaskConical className="text-primary" />
        <CardTitle>Invited Beta Tester entitlement</CardTitle>
        <CardDescription>{njcPlusBetaDisclosure}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Clerk user_…" className="font-mono" />
          <Button onClick={() => void lookup()} disabled={busy || userId.length < 3}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Search />} Look up
          </Button>
        </div>
        {data ? <p className="text-sm text-muted-foreground">
          {data.betaCapacity.used} of {data.betaCapacity.limit} temporary tester places are reserved.
        </p> : null}
      </CardContent>
    </Card>

    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <CardTitle>Tester history</CardTitle>
          <CardDescription>Beta grants remain separate from NJC+ Member, NJC+ Trial, and complimentary access records.</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? <p className="text-sm text-muted-foreground">Look up an account to inspect its beta history.</p> :
            !data.betaGrants.length ? <p className="text-sm text-muted-foreground">This account has no invited beta history.</p> :
              <div className="divide-y">{data.betaGrants.map((grant) => <article key={grant.id} className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <strong>Invited Beta Tester</strong>
                    <p className="text-sm text-muted-foreground">{grant.featureKeys.map((key) => featureLabels[key as NjcPlusInvitedBetaFeature] ?? key).join(", ")}</p>
                    <small>{new Date(grant.startsAt).toLocaleString()} → {new Date(grant.endsAt).toLocaleString()}</small>
                  </div>
                  <span className="capitalize">{grant.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Premium content: {grant.premiumContentIncluded ? "included" : grant.contentIds.length ? `${grant.contentIds.length} selected item(s)` : "not included"} · NJC+ member styling: {grant.showMemberBranding ? "shown" : "hidden"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy || grant.status === "revoked" || grant.status === "converted"} onClick={() => edit(grant)}>Edit</Button>
                  {grant.status === "paused"
                    ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus(grant.id, "resume_invited_beta")}>Resume</Button>
                    : <Button size="sm" variant="outline" disabled={busy || grant.status !== "active"} onClick={() => void changeStatus(grant.id, "pause_invited_beta")}>Pause</Button>}
                  <Button size="sm" variant="destructive" disabled={busy || ["revoked", "converted"].includes(grant.status)} onClick={() => void changeStatus(grant.id, "revoke_invited_beta")}>Revoke</Button>
                </div>
              </article>)}</div>}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <ShieldAlert className="text-primary" />
          <CardTitle>{editingId ? "Edit temporary beta access" : "Invite a tester"}</CardTitle>
          <CardDescription>A tester must be a non-member. Access must have a start and expiration date and cannot exceed one year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Selected beta features</legend>
            {njcPlusInvitedBetaFeatures.map((feature) => <Label key={feature} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featureKeys.includes(feature)} onChange={(event) => setForm((current) => ({
                ...current,
                featureKeys: event.target.checked
                  ? [...current.featureKeys, feature]
                  : current.featureKeys.filter((item) => item !== feature),
              }))} />
              {featureLabels[feature]}
            </Label>)}
          </fieldset>
          <Label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.premiumContentIncluded} onChange={(event) => setForm({ ...form, premiumContentIncluded: event.target.checked })} />
            Include the NJC+ premium catalog
          </Label>
          <Label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.showMemberBranding} onChange={(event) => setForm({ ...form, showMemberBranding: event.target.checked })} />
            Show NJC+ member styling (identity remains beta tester)
          </Label>
          <Field label="Selected content IDs (optional)"><Input value={form.contentIds} onChange={(event) => setForm({ ...form, contentIds: event.target.value })} placeholder="UUIDs separated by commas" /></Field>
          <Field label="Access starts"><Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
          <Field label="Access expires"><Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></Field>
          <Field label="Audit reason"><Input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Why this tester needs access" /></Field>
          <Button className="w-full" disabled={busy || userId.length < 3 || !validDates || form.featureKeys.length === 0 || form.reason.length < 8} onClick={() => void submit()}>
            {editingId ? "Save beta access" : "Grant invited beta access"}
          </Button>
          {editingId ? <Button className="w-full" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</Button> : null}
          {message ? <p className="text-xs" role="status">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="block space-y-2"><span>{label}</span>{children}</Label>;
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
