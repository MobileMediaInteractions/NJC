"use client";

import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, LockKeyhole, Pencil, RotateCcw, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toLocalDateTimeInput } from "@/lib/local-datetime";
import type { StoryStatus } from "@/lib/types";

type Approval = { approvedAt: string; note: string | null } | null;
type PublicationJob = { status: string; originalScheduledAt: string; scheduledAt: string; attempts: number; error: string | null } | null;

export function StoryReviewActions({ id, slug, headline, bylineName, status, scheduledAt, publicationTimezone, canPublish, canApprove, canSubmitReview, isActive, activeStoryRevisionsEnabled, approval, publicationJob, publicationBlocker }: { id: string; slug: string; headline: string; bylineName: string; status: StoryStatus; scheduledAt: string | null; publicationTimezone: string; canPublish: boolean; canApprove: boolean; canSubmitReview: boolean; isActive: boolean; activeStoryRevisionsEnabled: boolean; approval: Approval; publicationJob: PublicationJob; publicationBlocker?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"schedule" | "publish" | "approve" | "close" | null>(null);
  const [activePublication, setActivePublication] = useState(isActive && activeStoryRevisionsEnabled);
  const [closeConfirmation, setCloseConfirmation] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [scheduleValue, setScheduleValue] = useState(() => toLocalDateTimeInput(scheduledAt));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scheduleDate = useMemo(() => scheduleValue ? new Date(scheduleValue) : null, [scheduleValue]);
  const utcPreview = scheduleDate && !Number.isNaN(scheduleDate.getTime()) ? scheduleDate.toISOString() : "Choose a valid local date and time";
  const dstWarning = scheduleDate && !Number.isNaN(scheduleDate.getTime()) ? daylightSavingWarning(scheduleDate, publicationTimezone) : null;

  async function request(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/v1/studio/stories/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? `The editorial action failed (${response.status}).`);
      setDialog(null); router.refresh(); return payload;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The newsroom service could not be reached.");
      return null;
    } finally { setBusy(null); }
  }

  async function transition(nextStatus: "draft" | "review" | "scheduled" | "published") {
    if (nextStatus === "scheduled") {
      if (!scheduleDate || Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() < Date.now() + 60_000) return setError("Choose a publication time at least one minute in the future.");
    }
    const payload = await request({ status: nextStatus, ...((nextStatus === "scheduled" || nextStatus === "published") ? { isActive: activePublication } : {}), ...(nextStatus === "scheduled" && scheduleDate ? { scheduledAt: scheduleDate.toISOString() } : {}) }, nextStatus);
    if (!payload) return;
    if (nextStatus === "published") return window.location.assign(`/story/${payload?.data?.slug ?? slug}`);
    setMessage(nextStatus === "review" ? "Story submitted for independent review." : nextStatus === "scheduled" ? "Approved publication queued." : "Story returned to draft; prior approval was invalidated.");
  }

  async function approve() {
    const payload = await request({ action: "approve", note: approvalNote }, "approve");
    if (payload) setMessage("Current content revision approved. Scheduling and publication are now available.");
  }

  async function cancelSchedule() {
    const payload = await request({ action: "cancel_schedule", confirmation: "CANCEL SCHEDULE" }, "cancel");
    if (payload) setMessage("Schedule cancelled. The approved story is back in review.");
  }

  async function closeEditing() {
    if (closeConfirmation !== "CLOSE STORY") return setError("Type CLOSE STORY exactly before closing editing.");
    const payload = await request({ action: "close_editing", confirmation: closeConfirmation }, "close");
    if (payload) setMessage("The story is final and can no longer be edited.");
  }

  function preset(minutes: number) {
    const next = new Date(Date.now() + minutes * 60_000);
    next.setSeconds(0, 0);
    setScheduleValue(toLocalDateTimeInput(next.toISOString()));
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" asChild><Link href="/studio/stories"><ArrowLeft /> All stories</Link></Button>
      {(status === "draft" || status === "review" || status === "scheduled") && canSubmitReview ? <Button variant="outline" asChild><Link href={`/studio/stories/${id}/edit`}><Pencil /> Edit story</Link></Button> : null}
      {status === "draft" && canSubmitReview ? <Button onClick={() => void transition("review")} disabled={busy !== null}>{busy === "review" ? <Loader2 className="animate-spin" /> : <Send />} Submit for review</Button> : null}
      {status === "review" && canPublish ? <Button variant="outline" onClick={() => void transition("draft")} disabled={busy !== null}><RotateCcw /> Return to draft</Button> : null}
      {status === "review" && !approval && canApprove ? <Button onClick={() => setDialog("approve")} disabled={busy !== null || Boolean(publicationBlocker)}><ShieldCheck /> Approve revision</Button> : null}
      {status === "review" && approval && canPublish ? <><Button variant="outline" onClick={() => setDialog("schedule")} disabled={Boolean(publicationBlocker)}><CalendarClock /> Schedule</Button><Button onClick={() => setDialog("publish")} disabled={Boolean(publicationBlocker)}><Send /> Publish now</Button></> : null}
      {status === "scheduled" && canPublish ? <><Button variant="outline" onClick={() => void cancelSchedule()} disabled={busy !== null}><RotateCcw /> Cancel schedule</Button><Button variant="outline" onClick={() => setDialog("schedule")} disabled={Boolean(publicationBlocker)}><CalendarClock /> Reschedule</Button><Button onClick={() => setDialog("publish")} disabled={Boolean(publicationBlocker)}><Send /> Publish now</Button></> : null}
      {status === "published" && isActive && canSubmitReview ? <Button variant="outline" asChild><Link href={`/studio/stories/${id}/edit`}><Pencil /> Propose update</Link></Button> : null}
      {status === "published" && isActive && canPublish ? <Button variant="outline" onClick={() => setDialog("close")}><LockKeyhole /> Mark story final</Button> : null}
      {status === "published" ? <Button asChild><Link href={`/story/${slug}`}>View live story</Link></Button> : null}
    </div>

    {publicationBlocker ? <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-medium text-amber-500">{publicationBlocker}</p> : null}

    {approval ? <p className="text-sm text-emerald-400"><ShieldCheck className="mr-1.5 inline size-4" /> Approved {formatSchedule(approval.approvedAt, publicationTimezone)}{approval.note ? ` · ${approval.note}` : ""}</p> : status === "review" ? <p className="text-sm text-muted-foreground">Independent approval is required before scheduling or publishing.</p> : null}
    {publicationJob ? <p className="text-sm text-muted-foreground"><CalendarClock className="mr-1.5 inline size-4" /> Queue: <span className="capitalize">{publicationJob.status}</span> · {formatSchedule(publicationJob.scheduledAt, publicationTimezone)}{publicationJob.originalScheduledAt !== publicationJob.scheduledAt ? ` · originally ${formatSchedule(publicationJob.originalScheduledAt, publicationTimezone)}` : ""} · {publicationJob.attempts} attempt{publicationJob.attempts === 1 ? "" : "s"}{publicationJob.error ? ` · ${publicationJob.error}` : ""}</p> : null}
    {status === "published" ? <p className="text-sm text-muted-foreground">{isActive ? "Active story — approved updates may still be published." : "Final story — editing privileges are permanently closed."}</p> : null}
    {message ? <p role="status" className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="size-4" /> {message}</p> : null}
    {error && !dialog ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

    <AlertDialog open={dialog === "approve"} onOpenChange={(open) => setDialog(open ? "approve" : null)}><AlertDialogContent><AlertDialogHeader><AlertDialogMedia><ShieldCheck /></AlertDialogMedia><AlertDialogTitle>Approve this exact revision?</AlertDialogTitle><AlertDialogDescription>Your account, the content version and a SHA-256 content hash will be recorded. Any material edit invalidates this approval.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="approval-note">Approval note (optional)</Label><Input id="approval-note" value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Checks completed or context for the desk" /></div>{error ? <ErrorText text={error} /> : null}<AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><Button onClick={() => void approve()} disabled={busy !== null}>{busy === "approve" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Approve revision</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={dialog === "schedule"} onOpenChange={(open) => setDialog(open ? "schedule" : null)}><AlertDialogContent><AlertDialogHeader><AlertDialogMedia><CalendarClock /></AlertDialogMedia><AlertDialogTitle>{status === "scheduled" ? "Reschedule approved story" : "Schedule approved story"}</AlertDialogTitle><AlertDialogDescription>Enter local device time. Studio shows both the {publicationTimezone} newsroom interpretation and exact UTC instant. Times in a daylight-saving overlap must be confirmed from the UTC preview.</AlertDialogDescription></AlertDialogHeader><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => preset(15)}>In 15 min</Button><Button size="sm" variant="outline" onClick={() => preset(60)}>In 1 hour</Button><Button size="sm" variant="outline" onClick={() => preset(24 * 60)}>Tomorrow</Button></div><div className="space-y-2"><Label htmlFor="story-scheduled-at">Publication date and exact time</Label><Input id="story-scheduled-at" type="datetime-local" value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} /><div className="rounded-md border p-3 text-xs"><p><strong>Newsroom:</strong> {scheduleDate && !Number.isNaN(scheduleDate.getTime()) ? formatSchedule(scheduleDate.toISOString(), publicationTimezone) : "Invalid time"}</p><p className="mt-1 font-mono"><strong>UTC:</strong> {utcPreview}</p>{dstWarning ? <p className="mt-2 font-semibold text-amber-500">{dstWarning}</p> : null}</div></div>{activeStoryRevisionsEnabled ? <ActiveStoryChoice id="scheduled-active-story" checked={activePublication} onCheckedChange={setActivePublication} /> : null}{error ? <ErrorText text={error} /> : null}<AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><Button onClick={() => status === "scheduled" ? void request({ action: "reschedule", scheduledAt: scheduleDate?.toISOString(), confirmation: "RESCHEDULE" }, "reschedule").then((payload) => { if (payload) setMessage("Schedule updated and audit history preserved."); }) : void transition("scheduled")} disabled={busy !== null || !scheduleDate}>{busy ? <Loader2 className="animate-spin" /> : <CalendarClock />} Confirm exact time</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={dialog === "publish"} onOpenChange={(open) => setDialog(open ? "publish" : null)}><AlertDialogContent><AlertDialogHeader><AlertDialogMedia><Send /></AlertDialogMedia><AlertDialogTitle>Publish approved story now?</AlertDialogTitle><AlertDialogDescription>“{headline}” will appear under “By {bylineName}” across the site, apps, TV clients, feeds and search surfaces. Publication rechecks the approved content and byline.</AlertDialogDescription></AlertDialogHeader>{activeStoryRevisionsEnabled ? <ActiveStoryChoice id="publish-active-story" checked={activePublication} onCheckedChange={setActivePublication} /> : null}{error ? <ErrorText text={error} /> : null}<AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><Button onClick={() => void transition("published")} disabled={busy !== null}>{busy === "published" ? <Loader2 className="animate-spin" /> : <Send />} Confirm publication</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={dialog === "close"} onOpenChange={(open) => setDialog(open ? "close" : null)}><AlertDialogContent><AlertDialogHeader><AlertDialogMedia><LockKeyhole /></AlertDialogMedia><AlertDialogTitle>End editing permanently?</AlertDialogTitle><AlertDialogDescription>The story remains public, but new revisions will be disabled.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="close-story-confirmation">Type CLOSE STORY to verify</Label><Input id="close-story-confirmation" value={closeConfirmation} onChange={(event) => setCloseConfirmation(event.target.value)} /></div>{error ? <ErrorText text={error} /> : null}<AlertDialogFooter><AlertDialogCancel>Keep active</AlertDialogCancel><Button variant="destructive" onClick={() => void closeEditing()} disabled={busy !== null || closeConfirmation !== "CLOSE STORY"}><LockKeyhole /> Close editing</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function ErrorText({ text }: { text: string }) { return <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{text}</p>; }
function ActiveStoryChoice({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) { return <div className="flex items-start justify-between gap-5 rounded-lg border p-4"><div><Label htmlFor={id}>Keep this as an active story</Label><p className="mt-1 text-xs text-muted-foreground">Future updates still require independent approval.</p></div><Switch id={id} checked={checked} onCheckedChange={onCheckedChange} /></div>; }
function formatSchedule(value: string | null, timeZone: string) { if (!value) return "an unavailable time"; return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value)); }
function daylightSavingWarning(value: Date, timeZone: string) { const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }); const offset = (date: Date) => formatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value; const before = offset(new Date(value.getTime() - 2 * 60 * 60_000)); const after = offset(new Date(value.getTime() + 2 * 60 * 60_000)); return before && after && before !== after ? `Daylight-saving transition nearby (${before} → ${after}). Verify the UTC instant before saving.` : null; }
