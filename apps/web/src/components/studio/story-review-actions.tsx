"use client";

import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
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
import type { StoryStatus } from "@/lib/types";

export function StoryReviewActions({
  id,
  slug,
  headline,
  status,
  canPublish,
  canSubmitReview,
}: {
  id: string;
  slug: string;
  headline: string;
  status: StoryStatus;
  canPublish: boolean;
  canSubmitReview: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<StoryStatus | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function transition(nextStatus: "draft" | "review" | "published") {
    setBusy(nextStatus);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/v1/studio/stories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? `The editorial action failed (${response.status}).`);
        return;
      }
      setPublishOpen(false);
      if (nextStatus === "published") {
        window.location.assign(`/story/${payload?.data?.slug ?? slug}`);
        return;
      }
      setMessage(nextStatus === "review" ? "Story submitted for editorial review." : "Story returned to draft.");
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
        {status === "draft" && canSubmitReview ? <Button onClick={() => void transition("review")} disabled={busy !== null}>{busy === "review" ? <Loader2 className="animate-spin" /> : <Send />} Submit for review</Button> : null}
        {status === "review" && canPublish ? <>
          <Button variant="outline" onClick={() => void transition("draft")} disabled={busy !== null}>{busy === "draft" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Return to draft</Button>
          <AlertDialog open={publishOpen} onOpenChange={(open) => { if (!busy) setPublishOpen(open); }}>
            <AlertDialogTrigger asChild><Button disabled={busy !== null}><Send /> Publish story</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-primary/15 text-primary"><Send /></AlertDialogMedia>
                <AlertDialogTitle>Publish this story now?</AlertDialogTitle>
                <AlertDialogDescription>“{headline}” will immediately appear on the public site, apps, Roku, feeds and search sitemaps.</AlertDialogDescription>
              </AlertDialogHeader>
              {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy !== null}>Keep reviewing</AlertDialogCancel>
                <Button onClick={() => void transition("published")} disabled={busy !== null}>{busy === "published" ? <><Loader2 className="animate-spin" /> Publishing…</> : <><Send /> Confirm publication</>}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </> : null}
        {status === "published" ? <Button asChild><Link href={`/story/${slug}`}>View live story</Link></Button> : null}
      </div>
      {status === "review" && !canPublish ? <p className="text-sm text-muted-foreground">Awaiting an editor, producer or administrator.</p> : null}
      {status === "draft" && !canSubmitReview ? <p className="text-sm text-muted-foreground">Only the story owner or a publisher can submit this draft.</p> : null}
      {message ? <p role="status" className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="size-4" /> {message}</p> : null}
      {error && !publishOpen ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
