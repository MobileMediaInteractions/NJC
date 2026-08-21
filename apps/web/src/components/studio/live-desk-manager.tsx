"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  Edit3,
  Eye,
  FileClock,
  LoaderCircle,
  Megaphone,
  Pin,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import type {
  LiveCoverageEvent,
  LiveCoverageUpdate,
  LiveUpdateKind,
} from "@harborline/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type StudioUpdate = LiveCoverageUpdate & {
  status: "draft" | "published" | "retracted";
  retractedAt: string | null;
};

type Bundle = { event: LiveCoverageEvent; updates: StudioUpdate[] };
type Transition = "schedule" | "start" | "pause" | "resume" | "end" | "archive";

const updateKinds: Array<{ value: LiveUpdateKind; label: string }> = [
  { value: "update", label: "Standard update" },
  { value: "breaking", label: "Breaking development" },
  { value: "result", label: "Result or decision" },
  { value: "quote", label: "On-the-record quote" },
  { value: "context", label: "Context and background" },
  { value: "media", label: "Photo or video update" },
  { value: "correction", label: "Correction" },
];

export function LiveDeskManager({ initialBundles, canPublish }: { initialBundles: Bundle[]; canPublish: boolean }) {
  const [bundles, setBundles] = useState(initialBundles);
  const [selectedId, setSelectedId] = useState(initialBundles[0]?.event.id ?? "");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const selected = bundles.find((bundle) => bundle.event.id === selectedId) ?? null;

  async function refresh(preferredId = selectedId) {
    const response = await fetch("/api/v1/studio/live", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Bundle[]; error?: { message?: string } };
    if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Live desks could not be refreshed");
    setBundles(payload.data);
    if (payload.data.some((bundle) => bundle.event.id === preferredId)) setSelectedId(preferredId);
    else setSelectedId(payload.data[0]?.event.id ?? "");
  }

  async function run(label: string, request: () => Promise<Response>, preferredId = selectedId) {
    setBusy(label);
    setMessage("");
    try {
      const response = await request();
      const payload = (await response.json()) as { data?: unknown; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "The live-desk action failed");
      await refresh(preferredId);
      setMessage("Saved to the live desk.");
      return payload.data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The live-desk action failed");
      return null;
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Continuous coverage</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Live Desk</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Build a verified, minute-by-minute public record without turning a story draft into a stream of silent edits.</p>
        </div>
        <Button onClick={() => setCreating((value) => !value)}><Plus /> New live desk</Button>
      </div>

      {message ? <p role="status" className={`rounded-lg border p-3 text-sm ${/failed|could not|required|cannot|invalid/i.test(message) ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10"}`}>{message}</p> : null}
      {creating ? <CreateDesk busy={Boolean(busy)} onCancel={() => setCreating(false)} onCreate={async (input) => {
        const result = await run("create", () => fetch("/api/v1/studio/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }), "");
        if (result && typeof result === "object" && "id" in result) {
          setCreating(false);
          await refresh(String((result as { id: unknown }).id));
        }
      }} /> : null}

      <div className="grid min-h-[44rem] gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="self-start xl:sticky xl:top-4">
          <CardHeader><CardTitle>Coverage desks</CardTitle><CardDescription>{bundles.length} newsroom desk{bundles.length === 1 ? "" : "s"}</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {bundles.map((bundle) => (
              <button key={bundle.event.id} type="button" onClick={() => { setSelectedId(bundle.event.id); setPendingTransition(null); setConfirmation(""); }} className={`w-full rounded-lg border p-3 text-left transition ${selectedId === bundle.event.id ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "bg-muted/15 hover:bg-muted/35"}`}>
                <div className="flex items-center justify-between gap-2"><StatusBadge status={bundle.event.status} /><span className="text-xs text-muted-foreground">{bundle.event.updateCount}</span></div>
                <p className="mt-2 line-clamp-2 text-sm font-bold leading-5">{bundle.event.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{formatDate(bundle.event.updatedAt)}</p>
              </button>
            ))}
            {!bundles.length ? <div className="py-10 text-center text-sm text-muted-foreground"><Radio className="mx-auto size-7" /><p className="mt-2">No live desks yet.</p></div> : null}
          </CardContent>
        </Card>

        {selected ? (
          <div className="min-w-0 space-y-5">
            <DeskHeader bundle={selected} canPublish={canPublish} busy={busy} pendingTransition={pendingTransition} confirmation={confirmation} onConfirmation={setConfirmation} onChooseTransition={setPendingTransition} onTransition={async (transition) => {
              await run(transition, () => fetch(`/api/v1/studio/live/${selected.event.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transition, confirmation }) }));
              setPendingTransition(null);
              setConfirmation("");
            }} />
            <DeskSettings key={`settings-${selected.event.id}`} bundle={selected} canPublish={canPublish} busy={busy} onSave={(values) => run("settings", () => fetch(`/api/v1/studio/live/${selected.event.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }))} />
            <UpdateComposer key={`composer-${selected.event.id}`} event={selected.event} canPublish={canPublish} busy={busy} onSubmit={(values) => run(values.publish ? "publish-update" : "draft-update", () => fetch(`/api/v1/studio/live/${selected.event.id}/updates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }))} />
            <UpdateQueue key={`queue-${selected.event.id}`} bundle={selected} canPublish={canPublish} busy={busy} onAction={(update, action, extra) => run(`${action}-${update.id}`, () => fetch(`/api/v1/studio/live/${selected.event.id}/updates/${update.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) }))} />
          </div>
        ) : <Card><CardContent className="grid min-h-[32rem] place-items-center text-center text-sm text-muted-foreground"><div><Radio className="mx-auto size-9" /><p className="mt-3">Create or choose a live desk.</p></div></CardContent></Card>}
      </div>
    </div>
  );
}

function CreateDesk({ busy, onCancel, onCreate }: { busy: boolean; onCancel: () => void; onCreate: (input: { title: string; description: string; location: string }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  return <Card className="border-primary/35"><CardHeader><CardTitle>Open a new live desk</CardTitle><CardDescription>It begins as a private draft. A producer, editor or administrator must start public coverage.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">
    <Field label="Coverage title"><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="What readers are following" /></Field>
    <Field label="Location"><Input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={120} placeholder="New Brunswick, NJ" /></Field>
    <Field label="What this desk covers" className="lg:col-span-2"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1200} rows={4} placeholder="A concise, public explanation of the event and why it matters." /></Field>
    <div className="flex gap-2 lg:col-span-2"><Button disabled={busy || title.trim().length < 8 || description.trim().length < 20} onClick={() => void onCreate({ title, description, location })}>{busy ? <LoaderCircle className="animate-spin" /> : <Plus />} Create private draft</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
  </CardContent></Card>;
}

function DeskHeader({ bundle, canPublish, busy, pendingTransition, confirmation, onConfirmation, onChooseTransition, onTransition }: { bundle: Bundle; canPublish: boolean; busy: string; pendingTransition: Transition | null; confirmation: string; onConfirmation: (value: string) => void; onChooseTransition: (value: Transition | null) => void; onTransition: (transition: Transition) => Promise<void> }) {
  const transitions = availableTransitions(bundle.event.status);
  return <Card className="overflow-hidden"><div className="border-b-4 border-brand-yellow bg-brand-navy p-5 text-white sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><StatusBadge status={bundle.event.status} inverse /><h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{bundle.event.title}</h2><p className="mt-2 text-sm text-white/65">/{bundle.event.slug} · {bundle.event.updateCount} published updates</p></div><Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href={`/live/${bundle.event.slug}`} target="_blank" rel="noopener noreferrer"><Eye /> Public preview</a></Button></div></div><CardContent className="space-y-4 pt-5">
    <div className="flex flex-wrap gap-2">{transitions.map((transition) => <Button key={transition} variant={transition === "end" || transition === "archive" ? "destructive" : "outline"} disabled={!canPublish || Boolean(busy)} onClick={() => {
      if (["end", "archive"].includes(transition)) onChooseTransition(transition);
      else void onTransition(transition);
    }}>{transitionIcon(transition)}{transitionLabel(transition)}</Button>)}</div>
    {!canPublish ? <p className="text-xs text-muted-foreground">You can report and prepare drafts. A producer, editor or administrator controls public lifecycle actions.</p> : null}
    {pendingTransition ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-bold">Confirm {pendingTransitionLabel(pendingTransition)}</p><p className="mt-1 text-xs text-muted-foreground">Type the exact desk title: <strong>{bundle.event.title}</strong></p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={confirmation} onChange={(event) => onConfirmation(event.target.value)} aria-label="Exact live desk title confirmation" /><Button variant="destructive" disabled={confirmation !== bundle.event.title || Boolean(busy)} onClick={() => void onTransition(pendingTransition)}>{busy ? <LoaderCircle className="animate-spin" /> : pendingTransition === "end" ? <Square /> : <Archive />} Confirm</Button><Button variant="outline" onClick={() => onChooseTransition(null)}>Cancel</Button></div></div> : null}
  </CardContent></Card>;
}

function DeskSettings({ bundle, canPublish, busy, onSave }: { bundle: Bundle; canPublish: boolean; busy: string; onSave: (values: Record<string, unknown>) => Promise<unknown> }) {
  const event = bundle.event;
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [streamUrl, setStreamUrl] = useState(event.streamUrl ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(event.heroImageUrl ?? "");
  const [heroImageAlt, setHeroImageAlt] = useState(event.heroImageAlt ?? "");
  const [scheduledAt, setScheduledAt] = useState(event.scheduledAt ? toLocalDateTime(event.scheduledAt) : "");
  const [isFeatured, setIsFeatured] = useState(event.isFeatured);
  return <Card><CardHeader><CardTitle>Desk presentation</CardTitle><CardDescription>Public identity, schedule, verified stream and homepage treatment.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">
    <Field label="Title"><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} /></Field>
    <Field label="Location"><Input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={120} /></Field>
    <Field label="Description" className="lg:col-span-2"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1200} /></Field>
    <Field label="Scheduled start"><Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></Field>
    <Field label="HTTPS live stream"><Input type="url" value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder="https://" /></Field>
    <Field label="Hero image URL"><Input type="url" value={heroImageUrl} onChange={(event) => setHeroImageUrl(event.target.value)} placeholder="https://" /></Field>
    <Field label="Hero image description"><Input value={heroImageAlt} onChange={(event) => setHeroImageAlt(event.target.value)} maxLength={240} /></Field>
    <label className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4 lg:col-span-2"><span><span className="block text-sm font-bold">Feature this desk</span><span className="mt-1 block text-xs text-muted-foreground">Makes this the single live-coverage priority on public surfaces.</span></span><Switch checked={isFeatured} onCheckedChange={setIsFeatured} disabled={!canPublish} /></label>
    <div className="lg:col-span-2"><Button disabled={Boolean(busy) || title.trim().length < 8 || description.trim().length < 20} onClick={() => void onSave({ title, description, location, streamUrl, heroImageUrl, heroImageAlt, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null, isFeatured })}>{busy === "settings" ? <LoaderCircle className="animate-spin" /> : <Save />} Save presentation</Button></div>
  </CardContent></Card>;
}

function UpdateComposer({ event, canPublish, busy, onSubmit }: { event: LiveCoverageEvent; canPublish: boolean; busy: string; onSubmit: (values: Record<string, unknown>) => Promise<unknown> }) {
  const [kind, setKind] = useState<LiveUpdateKind>("update");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const canPublishNow = canPublish && ["live", "paused"].includes(event.status);
  async function submit(publish: boolean) {
    const result = await onSubmit({ kind, headline, body, sourceUrl, sourceLabel, mediaUrl, mediaAlt, isPinned, publish });
    if (result) { setHeadline(""); setBody(""); setSourceUrl(""); setSourceLabel(""); setMediaUrl(""); setMediaAlt(""); setIsPinned(false); }
  }
  return <Card className="border-primary/30"><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="size-5 text-primary" /> Post to the timeline</CardTitle><CardDescription>Every public update is timestamped, attributed and revision-tracked. Save uncertain copy as a draft.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">
    <Field label="Update type"><select value={kind} onChange={(event) => setKind(event.target.value as LiveUpdateKind)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{updateKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
    <Field label="Headline (optional)"><Input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={180} placeholder="The development in one line" /></Field>
    <Field label="Verified update" className="lg:col-span-2"><Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={7} maxLength={8000} placeholder="Write what changed, what is confirmed, and what readers need to know next." /></Field>
    <Field label="Source URL"><Input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></Field>
    <Field label="Source label"><Input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} maxLength={120} placeholder="Official results" /></Field>
    <Field label="Media URL"><Input type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://" /></Field>
    <Field label="Media description"><Input value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} maxLength={240} /></Field>
    <label className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4 lg:col-span-2"><span><span className="block text-sm font-bold">Pin as essential</span><span className="mt-1 block text-xs text-muted-foreground">Keeps this development above the chronological stream.</span></span><Switch checked={isPinned} onCheckedChange={setIsPinned} /></label>
    <div className="flex flex-wrap gap-2 lg:col-span-2"><Button variant="outline" disabled={Boolean(busy) || body.trim().length < 2} onClick={() => void submit(false)}>{busy === "draft-update" ? <LoaderCircle className="animate-spin" /> : <FileClock />} Save draft</Button><Button disabled={Boolean(busy) || body.trim().length < 2 || !canPublishNow} onClick={() => void submit(true)}>{busy === "publish-update" ? <LoaderCircle className="animate-spin" /> : <Radio />} Publish to live desk</Button>{!canPublishNow ? <p className="basis-full text-xs text-muted-foreground">Publishing becomes available to producers, editors and administrators after the desk starts. Drafting remains available.</p> : null}</div>
  </CardContent></Card>;
}

function UpdateQueue({ bundle, canPublish, busy, onAction }: { bundle: Bundle; canPublish: boolean; busy: string; onAction: (update: StudioUpdate, action: "publish" | "edit" | "pin" | "unpin" | "retract", extra: Record<string, unknown>) => Promise<unknown> }) {
  const updates = useMemo(() => [...bundle.updates].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)), [bundle.updates]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reason, setReason] = useState("");
  const [retractId, setRetractId] = useState<string | null>(null);
  const [retractConfirmation, setRetractConfirmation] = useState("");
  return <Card><CardHeader><CardTitle>Update queue</CardTitle><CardDescription>Draft, published and retracted material with correction-safe controls.</CardDescription></CardHeader><CardContent className="space-y-3">
    {updates.map((update) => <article key={update.id} className={`rounded-lg border p-4 ${update.status === "retracted" ? "opacity-55" : update.isPinned ? "border-brand-yellow bg-brand-yellow/5" : "bg-muted/10"}`}><div className="flex flex-wrap items-center gap-2"><Badge variant={update.status === "published" ? "default" : update.status === "draft" ? "secondary" : "destructive"}>{update.status}</Badge><Badge variant="outline">{update.kind}</Badge>{update.isPinned ? <Pin className="size-3.5 text-brand-yellow" /> : null}<span className="ml-auto text-xs text-muted-foreground">v{update.revision} · {formatDate(update.publishedAt)}</span></div>{update.headline ? <h3 className="mt-3 font-bold">{update.headline}</h3> : null}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{update.body}</p>{editId === update.id ? <div className="mt-4 space-y-3 rounded-lg border bg-background p-3"><Textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={5} /><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reason for the revision" /><div className="flex gap-2"><Button size="sm" disabled={editBody.trim().length < 2 || reason.trim().length < 8 || Boolean(busy)} onClick={async () => { const result = await onAction(update, "edit", { body: editBody, reason }); if (result) { setEditId(null); setReason(""); } }}><Save /> Save revision</Button><Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button></div></div> : null}{retractId === update.id ? <div className="mt-4 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required public-record reason" /><Input value={retractConfirmation} onChange={(event) => setRetractConfirmation(event.target.value)} placeholder="Type RETRACT" /><div className="flex gap-2"><Button size="sm" variant="destructive" disabled={retractConfirmation !== "RETRACT" || reason.trim().length < 8 || Boolean(busy)} onClick={async () => { const result = await onAction(update, "retract", { confirmation: retractConfirmation, reason }); if (result) { setRetractId(null); setReason(""); setRetractConfirmation(""); } }}><Trash2 /> Retract update</Button><Button size="sm" variant="outline" onClick={() => setRetractId(null)}>Cancel</Button></div></div> : null}<div className="mt-4 flex flex-wrap gap-2">{update.status === "draft" && canPublish && ["live", "paused"].includes(bundle.event.status) ? <Button size="sm" onClick={() => void onAction(update, "publish", { reason: "Draft reviewed and approved for the public live timeline" })}><CheckCircle2 /> Publish</Button> : null}{update.status !== "retracted" ? <Button size="sm" variant="outline" onClick={() => { setEditId(update.id); setEditBody(update.body); setReason(""); }}><Edit3 /> Edit</Button> : null}{update.status === "published" && canPublish ? <Button size="sm" variant="outline" onClick={() => void onAction(update, update.isPinned ? "unpin" : "pin", { reason: update.isPinned ? "Removed from essential updates" : "Marked as an essential update" })}><Pin /> {update.isPinned ? "Unpin" : "Pin"}</Button> : null}{update.status === "published" && canPublish ? <Button size="sm" variant="destructive" onClick={() => { setRetractId(update.id); setReason(""); setRetractConfirmation(""); }}><Trash2 /> Retract</Button> : null}</div></article>)}
    {!updates.length ? <div className="py-12 text-center text-sm text-muted-foreground"><Megaphone className="mx-auto size-7" /><p className="mt-2">No timeline updates yet.</p></div> : null}
  </CardContent></Card>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <Label className={`space-y-2 ${className}`}><span>{label}</span>{children}</Label>; }
function StatusBadge({ status, inverse = false }: { status: LiveCoverageEvent["status"]; inverse?: boolean }) { return <Badge variant={status === "live" ? "destructive" : status === "paused" ? "secondary" : "outline"} className={`capitalize ${inverse && status !== "live" ? "border-white/30 bg-white/10 text-white" : ""}`}>{status === "live" ? <Radio className="animate-pulse" /> : null}{status}</Badge>; }
function availableTransitions(status: LiveCoverageEvent["status"]): Transition[] { return status === "draft" ? ["schedule", "start", "archive"] : status === "scheduled" ? ["start", "archive"] : status === "live" ? ["pause", "end"] : status === "paused" ? ["resume", "end"] : status === "ended" ? ["archive"] : []; }
function transitionLabel(value: Transition) { return ({ schedule: "Schedule", start: "Start live", pause: "Pause", resume: "Resume", end: "End coverage", archive: "Archive" } as const)[value]; }
function pendingTransitionLabel(value: Transition) { return value === "end" ? "ending public coverage" : "archiving this desk"; }
function transitionIcon(value: Transition) { return value === "schedule" ? <CalendarClock /> : value === "start" || value === "resume" ? value === "resume" ? <RotateCcw /> : <Play /> : value === "pause" ? <CirclePause /> : value === "end" ? <Square /> : <Archive />; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function toLocalDateTime(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
