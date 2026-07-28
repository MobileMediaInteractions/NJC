"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import {
  FilePlus2,
  LoaderCircle,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toLocalDateTimeInput } from "@/lib/local-datetime";

export type DistributionPackageDetail = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "available" | "expired" | "revoked" | "archived";
  availableAt: string | null;
  embargoAt: string | null;
  expiresAt: string | null;
  downloadPolicy: "view_only" | "grant_controlled" | "download";
  termsText: string;
  slug: string;
  items: Array<{
    id: string;
    title: string;
    file: { filename: string; mimeType: string; size: number } | null;
    story: { headline: string } | null;
  }>;
  grants: Array<{
    id: string;
    userClerkId: string;
    downloadAllowed: boolean;
    revokedAt: string | null;
    expiresAt: string | null;
    startsAt: string;
    recipient: { name: string; email: string | null };
  }>;
};
type Account = {
  id: string;
  displayName: string;
  primaryEmail: string | null;
};
type Story = { id: string; headline: string; status: string };

export function DistributionPackageConsole({
  packageId,
  initialDetail,
}: {
  packageId: string;
  initialDetail: DistributionPackageDetail;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [detail, setDetail] =
    useState<DistributionPackageDetail>(initialDetail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [grantStartsAt, setGrantStartsAt] = useState(
    new Date().toISOString(),
  );
  const [grantExpiresAt, setGrantExpiresAt] = useState<string | null>(null);
  const [storyQuery, setStoryQuery] = useState("");
  const [stories, setStories] = useState<Story[]>([]);

  async function load() {
    const response = await fetch(
      `/api/v1/studio/distribution/packages/${packageId}`,
    );
    const payload = (await response.json()) as {
      data?: DistributionPackageDetail;
      error?: { message?: string };
    };
    if (response.ok && payload.data) setDetail(payload.data);
    else setMessage(payload.error?.message ?? "Package could not be loaded");
  }

  useEffect(() => {
    if (!accountQuery.trim()) return;
    const timer = setTimeout(() => {
      void fetch(
        `/api/v1/studio/distribution/accounts?q=${encodeURIComponent(accountQuery)}`,
      )
        .then((response) => response.json())
        .then((payload: { data?: Account[] }) => setAccounts(payload.data ?? []));
    }, 250);
    return () => clearTimeout(timer);
  }, [accountQuery]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch(
        `/api/v1/studio/distribution/stories?q=${encodeURIComponent(storyQuery)}`,
      )
        .then((response) => response.json())
        .then((payload: { data?: Story[] }) => setStories(payload.data ?? []));
    }, 250);
    return () => clearTimeout(timer);
  }, [storyQuery]);

  async function save() {
    if (!detail) return;
    setBusy(true);
    const response = await fetch(
      `/api/v1/studio/distribution/packages/${packageId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detail.title,
          description: detail.description,
          status: detail.status,
          availableAt: detail.availableAt,
          embargoAt: detail.embargoAt,
          expiresAt: detail.expiresAt,
          downloadPolicy: detail.downloadPolicy,
          termsText: detail.termsText,
        }),
      },
    );
    setMessage(
      response.ok ? "Package settings saved." : "Package settings could not be saved.",
    );
    setBusy(false);
    await load();
  }

  async function uploadFiles(files: FileList) {
    setBusy(true);
    for (const file of [...files]) {
      try {
        await upload(`distribution/${packageId}/${file.name}`, file, {
          access: "private",
          handleUploadUrl:
            "/api/v1/studio/distribution/files/client-upload",
          clientPayload: JSON.stringify({
            packageId,
            filename: file.name,
            title: file.name.replace(/\.[^.]+$/, ""),
          }),
        });
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : `${file.name} upload failed`,
        );
      }
    }
    setBusy(false);
    await load();
  }

  async function grant() {
    if (!selectedAccount) return;
    setBusy(true);
    const response = await fetch(
      `/api/v1/studio/distribution/packages/${packageId}/grants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userClerkId: selectedAccount.id,
          startsAt: grantStartsAt,
          expiresAt: grantExpiresAt,
          downloadAllowed,
        }),
      },
    );
    setMessage(response.ok ? "Recipient access saved." : "Access grant failed.");
    setBusy(false);
    await load();
  }

  async function attachStory(story: Story) {
    setBusy(true);
    const response = await fetch(
      `/api/v1/studio/distribution/packages/${packageId}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      },
    );
    setMessage(response.ok ? "Advance story attached." : "Story attachment failed.");
    setBusy(false);
    await load();
  }

  async function removeItem(itemId: string) {
    if (!confirm("Remove this item from the package? The source content remains intact.")) return;
    await fetch(
      `/api/v1/studio/distribution/packages/${packageId}/items?itemId=${itemId}`,
      { method: "DELETE" },
    );
    await load();
  }

  async function revoke(grantId: string) {
    if (!confirm("Revoke this recipient's access immediately?")) return;
    await fetch(
      `/api/v1/studio/distribution/packages/${packageId}/grants?grantId=${grantId}`,
      { method: "DELETE" },
    );
    await load();
  }

  if (!detail)
    return (
      <div className="grid min-h-72 place-content-center">
        <LoaderCircle className="animate-spin" />
        <p className="mt-2 text-sm text-muted-foreground">
          Loading private package…
        </p>
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Distribution package</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{detail.title}</h1>
          <p className="text-sm text-muted-foreground">/{detail.slug}</p>
        </div>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
          Save package
        </Button>
      </div>
      {message ? <p className="mt-4 rounded-md border p-3 text-sm" role="status">{message}</p> : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Release controls</CardTitle></CardHeader><CardContent className="space-y-4">
          <Field label="Title"><Input value={detail.title} onChange={(event) => setDetail({ ...detail, title: event.target.value })} /></Field>
          <Field label="Description"><Textarea value={detail.description} onChange={(event) => setDetail({ ...detail, description: event.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><Select value={detail.status} onValueChange={(status) => setDetail({ ...detail, status: status as DistributionPackageDetail["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft","available","expired","revoked","archived"].map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Download policy"><Select value={detail.downloadPolicy} onValueChange={(downloadPolicy) => setDetail({ ...detail, downloadPolicy: downloadPolicy as DistributionPackageDetail["downloadPolicy"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="view_only">View only</SelectItem><SelectItem value="grant_controlled">Per recipient</SelectItem><SelectItem value="download">Download for all recipients</SelectItem></SelectContent></Select></Field></div>
          <div className="grid gap-4 sm:grid-cols-3"><DateField label="Available" value={detail.availableAt} onChange={(availableAt) => setDetail({ ...detail, availableAt })} /><DateField label="Embargo lifts" value={detail.embargoAt} onChange={(embargoAt) => setDetail({ ...detail, embargoAt })} /><DateField label="Expires" value={detail.expiresAt} onChange={(expiresAt) => setDetail({ ...detail, expiresAt })} /></div>
          <Field label="Terms shown to recipients"><Textarea value={detail.termsText} onChange={(event) => setDetail({ ...detail, termsText: event.target.value })} /></Field>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Authorized recipients</CardTitle></CardHeader><CardContent className="space-y-4">
          <Field label="Find a verified account"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={accountQuery} onChange={(event) => { const value = event.target.value; setAccountQuery(value); setSelectedAccount(null); if (!value.trim()) setAccounts([]); }} placeholder="Name, username, or email" /></div></Field>
          {accounts.length && !selectedAccount ? <div className="rounded-md border">{accounts.map((account) => <button type="button" key={account.id} onClick={() => { setSelectedAccount(account); setAccountQuery(account.displayName); setAccounts([]); }} className="block w-full border-b p-3 text-left text-sm last:border-0 hover:bg-muted"><strong>{account.displayName}</strong><small className="block text-muted-foreground">{account.primaryEmail}</small></button>)}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2"><DateField label="Access starts" value={grantStartsAt} onChange={(value) => setGrantStartsAt(value ?? new Date().toISOString())} /><DateField label="Access expires (optional)" value={grantExpiresAt} onChange={setGrantExpiresAt} /></div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3"><div><Label>Allow downloads</Label><p className="text-xs text-muted-foreground">{detail.downloadPolicy === "grant_controlled" ? "This recipient may download package files." : detail.downloadPolicy === "download" ? "The package policy allows downloads for every active recipient." : "The package is view-only for every recipient."}</p></div><Switch checked={detail.downloadPolicy === "download" || downloadAllowed} disabled={detail.downloadPolicy !== "grant_controlled"} onCheckedChange={setDownloadAllowed} /></div>
          <Button disabled={!selectedAccount || busy} onClick={() => void grant()}><ShieldCheck /> Grant access</Button>
          <div className="space-y-2">{detail.grants.map((grant) => <div key={grant.id} className="flex items-center justify-between rounded-md border p-3"><div><strong className="text-sm">{grant.recipient.name}</strong><small className="block text-muted-foreground">{grant.recipient.email ?? "Verified account"} · {grant.revokedAt ? "Revoked" : detail.downloadPolicy === "download" || (detail.downloadPolicy === "grant_controlled" && grant.downloadAllowed) ? "View + download" : "View only"}</small><small className="block text-muted-foreground">{new Date(grant.startsAt).toLocaleString()} → {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : "No expiration"}</small></div>{!grant.revokedAt ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void revoke(grant.id)}><Trash2 /> Revoke</Button> : null}</div>)}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Private files</CardTitle></CardHeader><CardContent>
          <input ref={inputRef} type="file" multiple className="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,application/pdf,text/plain,text/csv,application/json" onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); event.target.value = ""; }} />
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}><Upload /> Upload private media</Button>
          <p className="mt-2 text-xs text-muted-foreground">Files are stored in private Blob storage and never receive a public media URL.</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Attach an advance story</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label="Search drafts, review, or scheduled stories"><Input value={storyQuery} onChange={(event) => setStoryQuery(event.target.value)} placeholder="Headline" /></Field>
          <div className="max-h-56 overflow-y-auto rounded-md border">{stories.map((story) => <button key={story.id} type="button" onClick={() => void attachStory(story)} className="flex w-full items-center gap-3 border-b p-3 text-left last:border-0 hover:bg-muted"><FilePlus2 className="size-4" /><span className="min-w-0"><strong className="block truncate text-sm">{story.headline}</strong><small className="capitalize text-muted-foreground">{story.status}</small></span></button>)}</div>
        </CardContent></Card>
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Package contents</CardTitle></CardHeader><CardContent className="space-y-2">{detail.items.length ? detail.items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border p-3"><div><strong className="text-sm">{item.title}</strong><small className="block text-muted-foreground">{item.file ? `${item.file.mimeType} · ${formatBytes(item.file.size)}` : `Advance story · ${item.story?.headline}`}</small></div><Button variant="ghost" size="sm" className="text-destructive" onClick={() => void removeItem(item.id)}><Trash2 /> Remove</Button></div>) : <p className="text-sm text-muted-foreground">No files or stories attached.</p>}</CardContent></Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) { return <Field label={label}><Input type="datetime-local" value={toLocalDateTimeInput(value)} onChange={(event) => onChange(event.target.value ? new Date(event.target.value).toISOString() : null)} /></Field>; }
function formatBytes(value: number) { if (!value) return "0 B"; const units = ["B","KB","MB","GB"]; const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3); return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
