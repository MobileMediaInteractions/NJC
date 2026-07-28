"use client";

import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, Pencil, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalDateTimeInput } from "@/lib/local-datetime";
import type { StoryStatus } from "@/lib/types";

export function StoryReviewActions({
  id,
  slug,
  headline,
  bylineName,
  status,
  scheduledAt,
  publicationTimezone,
  canPublish,
  canSubmitReview,
}: {
  id: string;
  slug: string;
  headline: string;
  bylineName: string;
  status: StoryStatus;
  scheduledAt: string | null;
  publicationTimezone: string;
  canPublish: boolean;
  canSubmitReview: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<StoryStatus | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState(() =>
    toLocalDateTimeInput(scheduledAt),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function transition(
    nextStatus: "draft" | "review" | "scheduled" | "published",
  ) {
    const parsedSchedule =
      nextStatus === "scheduled" ? new Date(scheduleValue) : null;
    if (
      nextStatus === "scheduled" &&
      (!parsedSchedule ||
        Number.isNaN(parsedSchedule.getTime()) ||
        parsedSchedule.getTime() < Date.now() + 60_000)
    ) {
      setError(
        "Choose a valid publication date and time at least one minute in the future.",
      );
      return;
    }
    setBusy(nextStatus);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/v1/studio/stories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          ...(parsedSchedule
            ? { scheduledAt: parsedSchedule.toISOString() }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? `The editorial action failed (${response.status}).`);
        return;
      }
      setPublishOpen(false);
      setScheduleOpen(false);
      if (nextStatus === "published") {
        window.location.assign(`/story/${payload?.data?.slug ?? slug}`);
        return;
      }
      setMessage(
        nextStatus === "review"
          ? status === "scheduled"
            ? "Schedule cancelled. The story is back in editorial review."
            : "Story submitted for editorial review."
          : nextStatus === "scheduled"
            ? "Publication scheduled."
            : "Story returned to draft.",
      );
      router.refresh();
    } catch {
      setError("The newsroom service could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><Link href="/studio/stories"><ArrowLeft /> All stories</Link></Button>
        {(status === "draft" || status === "review" || status === "scheduled") && canSubmitReview ? <Button variant="outline" asChild><Link href={`/studio/stories/${id}/edit`}><Pencil /> Edit story</Link></Button> : null}
        {status === "draft" && canSubmitReview ? <Button onClick={() => void transition("review")} disabled={busy !== null}>{busy === "review" ? <Loader2 className="animate-spin" /> : <Send />} Submit for review</Button> : null}
        {status === "review" && canPublish ? <>
          <Button variant="outline" onClick={() => void transition("draft")} disabled={busy !== null}>{busy === "draft" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Return to draft</Button>
          <AlertDialog open={scheduleOpen} onOpenChange={(open) => { if (!busy) { setScheduleOpen(open); setError(""); } }}>
            <AlertDialogTrigger asChild><Button variant="outline" disabled={busy !== null}><CalendarClock /> Schedule</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-primary/15 text-primary"><CalendarClock /></AlertDialogMedia>
                <AlertDialogTitle>Schedule this story</AlertDialogTitle>
                <AlertDialogDescription>Choose when “{headline}” should become public. The time is entered in your device timezone; the Courier publication timezone is {publicationTimezone}.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="story-scheduled-at">Publication date and time</Label>
                <Input id="story-scheduled-at" type="datetime-local" value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} />
              </div>
              {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy !== null}>Keep reviewing</AlertDialogCancel>
                <Button onClick={() => void transition("scheduled")} disabled={busy !== null || !scheduleValue}>{busy === "scheduled" ? <><Loader2 className="animate-spin" /> Scheduling…</> : <><CalendarClock /> Confirm schedule</>}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={publishOpen} onOpenChange={(open) => { if (!busy) { setPublishOpen(open); setError(""); } }}>
            <AlertDialogTrigger asChild><Button disabled={busy !== null}><Send /> Publish story</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-primary/15 text-primary"><Send /></AlertDialogMedia>
                <AlertDialogTitle>Publish this story now?</AlertDialogTitle>
                <AlertDialogDescription>“{headline}” will immediately appear under “By {bylineName}” on the public site, apps, Roku, feeds and search sitemaps.</AlertDialogDescription>
              </AlertDialogHeader>
              {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy !== null}>Keep reviewing</AlertDialogCancel>
                <Button onClick={() => void transition("published")} disabled={busy !== null}>{busy === "published" ? <><Loader2 className="animate-spin" /> Publishing…</> : <><Send /> Confirm publication</>}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </> : null}
        {status === "scheduled" && canPublish ? <>
          <Button variant="outline" onClick={() => void transition("review")} disabled={busy !== null}>{busy === "review" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Cancel schedule</Button>
          <AlertDialog open={publishOpen} onOpenChange={(open) => { if (!busy) { setPublishOpen(open); setError(""); } }}>
            <AlertDialogTrigger asChild><Button disabled={busy !== null}><Send /> Publish now</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-primary/15 text-primary"><Send /></AlertDialogMedia>
                <AlertDialogTitle>Publish ahead of schedule?</AlertDialogTitle>
                <AlertDialogDescription>“{headline}” is scheduled for {formatSchedule(scheduledAt, publicationTimezone)}. Publishing now will make it immediately public across the site, apps, Roku, feeds, and search sitemaps.</AlertDialogDescription>
              </AlertDialogHeader>
              {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy !== null}>Keep schedule</AlertDialogCancel>
                <Button onClick={() => void transition("published")} disabled={busy !== null}>{busy === "published" ? <><Loader2 className="animate-spin" /> Publishing…</> : <><Send /> Confirm publication</>}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </> : null}
        {status === "published" ? <Button asChild><Link href={`/story/${slug}`}>View live story</Link></Button> : null}
      </div>
      {status === "review" && !canPublish ? <p className="text-sm text-muted-foreground">Awaiting an editor, producer or administrator.</p> : null}
      {status === "review" && scheduledAt ? <p className="text-sm text-muted-foreground"><CalendarClock className="mr-1.5 inline size-4" /> Planned for {formatSchedule(scheduledAt, publicationTimezone)}. An authorized publisher must confirm Schedule before the clock becomes active.</p> : null}
      {status === "scheduled" ? <p className="text-sm text-muted-foreground"><CalendarClock className="mr-1.5 inline size-4" /> Scheduled for {formatSchedule(scheduledAt, publicationTimezone)}.</p> : null}
      {status === "draft" && !canSubmitReview ? <p className="text-sm text-muted-foreground">Only the story owner or a publisher can submit this draft.</p> : null}
      {message ? <p role="status" className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="size-4" /> {message}</p> : null}
      {error && !publishOpen && !scheduleOpen ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function formatSchedule(value: string | null, timeZone: string) {
  if (!value) return "an unavailable time";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
