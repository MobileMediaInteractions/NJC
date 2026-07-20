"use client";

import { Loader2, Trash2 } from "lucide-react";
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

export function StoryDeleteButton({
  id,
  headline,
  published,
}: {
  id: string;
  headline: string;
  published: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removeStory() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/studio/stories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error?.message ?? `The story could not be deleted (${response.status}).`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("The newsroom service could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (busy) return;
      setOpen(nextOpen);
      if (!nextOpen) setError("");
    }}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${headline}`}>
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this story permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            “{headline}” and its revision history will be removed. {published ? "It will also disappear from the public site, Roku, feeds and search sitemaps." : "This draft will no longer be available to the newsroom."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep story</AlertDialogCancel>
          <Button variant="destructive" onClick={() => void removeStory()} disabled={busy}>
            {busy ? <><Loader2 className="animate-spin" /> Deleting…</> : <><Trash2 /> Delete permanently</>}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
