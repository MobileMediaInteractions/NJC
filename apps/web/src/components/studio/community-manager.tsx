"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Check, Loader2, Plus, Send, ShieldAlert } from "lucide-react";
import type { communityBulletins, communityEventSubmissions } from "@harborline/backend/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { communityCategories } from "@/lib/community";

type Bulletin = typeof communityBulletins.$inferSelect;
type Submission = typeof communityEventSubmissions.$inferSelect;
type Draft = {
  title: string; category: string; description: string; startsAt: string; endsAt: string;
  venue: string; city: string; organizer: string; externalUrl: string;
};

const emptyDraft: Draft = { title: "", category: "community", description: "", startsAt: "", endsAt: "", venue: "", city: "", organizer: "", externalUrl: "" };

export function CommunityManager({ initialBulletins, initialSubmissions, canPublish, timezone }: { initialBulletins: Bulletin[]; initialSubmissions: Submission[]; canPublish: boolean; timezone: string }) {
  const router = useRouter();
  const [bulletins, setBulletins] = useState(initialBulletins);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [sourceSubmissionId, setSourceSubmissionId] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function createBulletin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const requestedStatus = submitter?.value === "published" ? "published" : "draft";
    if (requestedStatus === "published" && !canPublish) return;
    setBusyId("create"); setMessage(""); setError("");
    try {
      const response = await fetch(editingId ? `/api/v1/studio/community/bulletins/${editingId}` : "/api/v1/studio/community", { method: editingId ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, startsAt: toIsoDateTime(draft.startsAt), endsAt: toIsoDateTime(draft.endsAt), status: requestedStatus, isFeatured: false, submissionId: editingId ? undefined : sourceSubmissionId }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The bulletin could not be saved.");
      setBulletins((items) => editingId ? items.map((item) => item.id === editingId ? payload.data as Bulletin : item) : [payload.data as Bulletin, ...items]);
      if (sourceSubmissionId && !editingId) setSubmissions((items) => items.filter((item) => item.id !== sourceSubmissionId));
      setDraft(emptyDraft); setSourceSubmissionId(undefined); setEditingId(undefined); setStatus("draft");
      setMessage(requestedStatus === "published" ? "The event is now on the public bulletin." : "Draft saved. It is not visible to readers.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The bulletin could not be saved.");
    } finally { setBusyId(""); }
  }

  async function changeBulletinStatus(item: Bulletin, next: "draft" | "published" | "archived") {
    if (next === "published" && !canPublish) return;
    setBusyId(item.id); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/v1/studio/community/bulletins/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The listing could not be updated.");
      setBulletins((items) => items.map((record) => record.id === item.id ? payload.data as Bulletin : record));
      setMessage("Bulletin status updated."); router.refresh();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "The listing could not be updated."); }
    finally { setBusyId(""); }
  }

  async function changeSubmissionStatus(item: Submission, next: "reviewing" | "declined") {
    setBusyId(item.id); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/v1/studio/community/submissions/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The submission could not be updated.");
      setSubmissions((items) => items.map((record) => record.id === item.id ? { ...record, ...payload.data } : record));
      setMessage(next === "reviewing" ? "Submission marked as reviewing." : "Submission declined."); router.refresh();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "The submission could not be updated."); }
    finally { setBusyId(""); }
  }

  function prepareSubmission(item: Submission) {
    setDraft({ title: item.title, category: item.category, description: item.description, startsAt: dateForInput(item.startsAt), endsAt: "", venue: item.venue ?? "", city: item.city ?? "", organizer: item.organizer ?? "", externalUrl: item.externalUrl ?? "" });
    setSourceSubmissionId(item.id);
    setEditingId(undefined);
    setStatus("draft");
    document.getElementById("community-bulletin-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editBulletin(item: Bulletin) {
    setDraft({ title: item.title, category: item.category, description: item.description, startsAt: dateForInput(item.startsAt), endsAt: dateForInput(item.endsAt), venue: item.venue ?? "", city: item.city ?? "", organizer: item.organizer ?? "", externalUrl: item.externalUrl ?? "" });
    setEditingId(item.id);
    setSourceSubmissionId(undefined);
    setStatus(item.status === "published" ? "published" : "draft");
    document.getElementById("community-bulletin-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <div className="space-y-6">
    {message ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm" role="status">{message}</p> : null}
    {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(21rem,.85fr)]">
      <Card id="community-bulletin-editor" className="scroll-mt-6">
        <CardHeader><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-amber-700/10 text-amber-800 dark:text-amber-300"><Plus /></div><div><CardTitle>{editingId ? "Edit community listing" : sourceSubmissionId ? "Turn submission into bulletin" : "Create a community listing"}</CardTitle><CardDescription>Save privately as a draft or publish it to the reader bulletin.</CardDescription></div></div></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void createBulletin(event)}>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Event title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required minLength={5} maxLength={160} /></Field><Field label="Category"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{communityCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
            <Field label="Description"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} required minLength={30} maxLength={4_000} rows={4} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts"><Input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></Field><Field label="Ends (optional)"><Input type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} /></Field><Field label="Venue"><Input value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} maxLength={180} /></Field><Field label="City / town"><Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} maxLength={100} /></Field><Field label="Organizer"><Input value={draft.organizer} onChange={(e) => setDraft({ ...draft, organizer: e.target.value })} maxLength={160} /></Field><Field label="Event / RSVP link"><Input type="url" placeholder="https://" value={draft.externalUrl} onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })} /></Field></div>
            <p className="text-xs text-muted-foreground">Enter event times in your device’s local time; public times display in {timezone}. Only published listings are visible publicly.</p>
            {sourceSubmissionId ? <div className="rounded-lg bg-muted/30 p-3 text-sm">Creating this bulletin will mark its private reader submission approved. The submitter’s contact information is never made public.</div> : null}
            <div className="flex flex-wrap gap-2"><Button type="submit" name="publicationStatus" value="draft" variant="outline" disabled={busyId === "create"}>{busyId === "create" && status === "draft" ? <Loader2 className="animate-spin" /> : null}Save draft</Button><Button type="submit" name="publicationStatus" value="published" disabled={!canPublish || busyId === "create"}>{busyId === "create" && status === "published" ? <Loader2 className="animate-spin" /> : <Send />}{editingId && status === "published" ? "Save changes" : "Publish bulletin"}</Button>{sourceSubmissionId || editingId ? <Button type="button" variant="ghost" onClick={() => { setDraft(emptyDraft); setSourceSubmissionId(undefined); setEditingId(undefined); setStatus("draft"); }}>Clear</Button> : null}</div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" /> Bulletin status</CardTitle><CardDescription>{bulletins.filter((item) => item.status === "published").length} public · {bulletins.filter((item) => item.status === "draft").length} drafts</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {bulletins.length ? bulletins.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={item.status === "published" ? "default" : "secondary"} className="capitalize">{item.status}</Badge>{item.startsAt ? <span className="text-xs text-muted-foreground">{formatDate(item.startsAt, timezone)}</span> : null}</div><h3 className="mt-2 font-semibold">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description}</p></div><div className="flex shrink-0 flex-col gap-1"><Button size="sm" variant="outline" disabled={busyId === item.id || (item.status === "published" && !canPublish)} onClick={() => editBulletin(item)}>Edit</Button>{item.status !== "published" && canPublish ? <Button size="sm" disabled={busyId === item.id} onClick={() => void changeBulletinStatus(item, "published")}>{busyId === item.id ? <Loader2 className="animate-spin" /> : <Check />} Publish</Button> : null}{item.status === "published" ? <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void changeBulletinStatus(item, "draft")}>Unpublish</Button> : item.status === "draft" ? <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => void changeBulletinStatus(item, "archived")}>Archive</Button> : null}</div></div></article>) : <Empty text="No community listings yet. Drafts stay private until published." />}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Reader-submitted events</CardTitle><CardDescription>Private contact details are visible only to authorized newsroom staff.</CardDescription></div><Badge variant="destructive">{submissions.filter((item) => item.status === "pending").length} pending</Badge></div></CardHeader>
      <CardContent className="space-y-3">
        {submissions.length ? submissions.map((item) => <article key={item.id} className="rounded-xl border bg-muted/10 p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={item.status === "pending" ? "destructive" : "secondary"} className="capitalize">{item.status}</Badge><Badge variant="outline">{communityCategories.find(([value]) => value === item.category)?.[1] ?? "Community"}</Badge><time className="text-xs text-muted-foreground">{formatDate(item.createdAt, timezone)}</time></div><h3 className="mt-3 text-lg font-semibold">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.description}</p><p className="mt-3 text-xs">{[item.organizer, item.venue, item.city].filter(Boolean).join(" · ") || "Location not provided"}</p><p className="mt-1 text-xs text-muted-foreground">From {item.submitterName || "Name not provided"} · {item.submitterEmail || "No contact email"}</p>{item.externalUrl ? <a className="mt-2 inline-block text-xs text-primary underline" href={item.externalUrl} target="_blank" rel="noreferrer">Submitted event link</a> : null}</div><div className="flex shrink-0 flex-wrap items-start gap-2">{item.status !== "declined" && item.status !== "approved" ? <><Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => prepareSubmission(item)}>Use in bulletin</Button><Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => void changeSubmissionStatus(item, "reviewing")}>Mark reviewing</Button><Button size="sm" variant="destructive" disabled={busyId === item.id} onClick={() => void changeSubmissionStatus(item, "declined")}>{busyId === item.id ? <Loader2 className="animate-spin" /> : null}Decline</Button></> : <span className="text-xs text-muted-foreground">{item.status === "approved" ? "Bulletin created" : "Closed"}</span>}</div></div></article>) : <Empty text="No reader event suggestions yet." />}
      </CardContent>
    </Card>
    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><ShieldAlert className="size-5 shrink-0 text-amber-600" /><p>Reader suggestions are unverified leads, not published claims. Check event details, dates, venue, links and organizer identity before creating or publishing a listing.</p></div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</p>; }
function dateForInput(value: Date | null) { if (!value) return ""; const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function toIsoDateTime(value: string) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toISOString(); }
function formatDate(value: Date, timezone: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(value); }
