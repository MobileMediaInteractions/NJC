"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  GitCompareArrows,
  Loader2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildStoryRevisionDiff,
  type StoryFieldChange,
  type StoryRevisionSnapshot,
} from "@/lib/story-revisions";

export type StoryRevisionRow = {
  id: string;
  version: number;
  baseVersion: number | null;
  snapshot: StoryRevisionSnapshot;
  note: string | null;
  reviewStatus: string;
  editorName: string;
  reviewerName: string | null;
  editorIsViewer: boolean;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export function StoryRevisionHistory({
  storyId,
  liveSnapshot,
  revisions,
  canReview,
}: {
  storyId: string;
  liveSnapshot: StoryRevisionSnapshot;
  revisions: StoryRevisionRow[];
  canReview: boolean;
}) {
  const pending = revisions.find((revision) => revision.reviewStatus === "pending");
  const history = revisions.filter((revision) => revision.reviewStatus !== "pending");

  return (
    <section className="space-y-5">
      {pending ? (
        <PendingRevision
          storyId={storyId}
          revision={pending}
          changes={buildStoryRevisionDiff(liveSnapshot, pending.snapshot)}
          canReview={canReview && !pending.editorIsViewer}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompareArrows className="size-5" /> Edit history
          </CardTitle>
          <CardDescription>
            Immutable snapshots show exactly what changed, who changed it and
            how the editorial decision was resolved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length ? (
            history.map((revision) => (
              <RevisionHistoryItem
                key={revision.id}
                revision={revision}
                changes={buildStoryRevisionDiff(
                  baseSnapshot(revision, revisions),
                  revision.snapshot,
                )}
              />
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No historical revisions have been recorded.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function PendingRevision({
  storyId,
  revision,
  changes,
  canReview,
}: {
  storyId: string;
  revision: StoryRevisionRow;
  changes: StoryFieldChange[];
  canReview: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function review(action: "approve" | "reject") {
    const required =
      action === "approve" ? "APPROVE UPDATE" : "REJECT UPDATE";
    if (confirmation !== required) {
      setMessage(`Type ${required} exactly before continuing.`);
      return;
    }
    setMessage("");
    startTransition(async () => {
      const response = await fetch(
        `/api/v1/studio/stories/${encodeURIComponent(storyId)}/revisions/${encodeURIComponent(revision.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, note, confirmation }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(
          payload?.error?.message ??
            `The revision could not be ${action === "approve" ? "approved" : "rejected"}.`,
        );
        return;
      }
      setMessage(
        action === "approve"
          ? "The approved update is now live."
          : "The update was rejected and retained in history.",
      );
      router.refresh();
    });
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-amber-600" />
              Live update awaiting approval
            </CardTitle>
            <CardDescription className="mt-1">
              Version {revision.version}, submitted by {revision.editorName}{" "}
              {formatWhen(revision.createdAt)}. The public story has not
              changed.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-black">Pending review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <RevisionDiff changes={changes} />
        {canReview ? (
          <div className="grid gap-4 rounded-xl border bg-background p-4 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-2">
              <Label htmlFor={`revision-note-${revision.id}`}>
                Editorial review note
              </Label>
              <Textarea
                id={`revision-note-${revision.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional approval context or required correction"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`revision-confirmation-${revision.id}`}>
                Manual verification
              </Label>
              <Input
                id={`revision-confirmation-${revision.id}`}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="APPROVE UPDATE or REJECT UPDATE"
                autoComplete="off"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => review("approve")}
                  disabled={pending || confirmation !== "APPROVE UPDATE"}
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Check />}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => review("reject")}
                  disabled={pending || confirmation !== "REJECT UPDATE"}
                >
                  <X /> Reject
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            {revision.editorIsViewer
              ? "A different publisher must review this update."
              : "Publisher access is required to resolve this update."}
          </p>
        )}
        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RevisionHistoryItem({
  revision,
  changes,
}: {
  revision: StoryRevisionRow;
  changes: StoryFieldChange[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0" />
        ) : (
          <ChevronRight className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <strong className="block truncate">
            Version {revision.version} · {revision.note ?? "Editorial snapshot"}
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            {revision.editorName} · {formatWhen(revision.createdAt)}
            {revision.reviewerName
              ? ` · reviewed by ${revision.reviewerName}`
              : ""}
          </span>
        </span>
        <Badge
          variant={
            revision.reviewStatus === "rejected" ? "destructive" : "secondary"
          }
          className="capitalize"
        >
          {revision.reviewStatus}
        </Badge>
      </button>
      {open ? (
        <div className="border-t p-4">
          <RevisionDiff changes={changes} />
          {revision.reviewNote ? (
            <p className="mt-4 rounded-md bg-muted p-3 text-sm">
              {revision.reviewNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function RevisionDiff({ changes }: { changes: StoryFieldChange[] }) {
  if (!changes.length) {
    return (
      <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        This snapshot records a workflow action without copy changes.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {changes.map((change) => (
        <div key={change.field} className="overflow-hidden rounded-lg border">
          <div className="border-b bg-muted/50 px-4 py-2 text-xs font-black uppercase tracking-wider">
            {change.label}
          </div>
          {change.lines ? (
            <div className="max-h-96 overflow-auto bg-[#081c15] font-mono text-xs text-white">
              {change.lines.map((line, index) => (
                <div
                  key={`${index}-${line.kind}`}
                  className={
                    line.kind === "added"
                      ? "bg-emerald-500/18 text-emerald-100"
                      : line.kind === "removed"
                        ? "bg-red-500/18 text-red-100"
                        : "text-white/55"
                  }
                >
                  <span className="inline-block w-8 select-none border-r border-white/10 px-2 py-1 text-center text-white/35">
                    {line.kind === "added"
                      ? "+"
                      : line.kind === "removed"
                        ? "−"
                        : " "}
                  </span>
                  <span className="whitespace-pre-wrap px-3 py-1">
                    {line.value || " "}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2">
              <DiffValue label="Before" value={change.before} removed />
              <DiffValue label="After" value={change.after} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DiffValue({
  label,
  value,
  removed = false,
}: {
  label: string;
  value: string;
  removed?: boolean;
}) {
  return (
    <div
      className={`min-w-0 p-4 ${removed ? "bg-red-500/8" : "bg-emerald-500/8"}`}
    >
      <p className="text-[0.65rem] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">
        {value || "None"}
      </p>
    </div>
  );
}

function baseSnapshot(
  revision: StoryRevisionRow,
  revisions: StoryRevisionRow[],
) {
  if (revision.baseVersion !== null) {
    const explicit = revisions.find(
      (candidate) => candidate.version === revision.baseVersion,
    );
    if (explicit) return explicit.snapshot;
  }
  const previous = revisions
    .filter(
      (candidate) =>
        candidate.version < revision.version &&
        candidate.reviewStatus === "applied",
    )
    .sort((left, right) => right.version - left.version)[0];
  return previous?.snapshot ?? {};
}

function formatWhen(value: string) {
  const deltaMs = new Date(value).getTime() - Date.now();
  const absoluteMs = Math.abs(deltaMs);
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (absoluteMs < 60 * 60 * 1_000) {
    return relative.format(Math.round(deltaMs / 60_000), "minute");
  }
  if (absoluteMs < 7 * 24 * 60 * 60 * 1_000) {
    return relative.format(Math.round(deltaMs / 3_600_000), "hour");
  }
  if (absoluteMs < 45 * 24 * 60 * 60 * 1_000) {
    return relative.format(Math.round(deltaMs / 86_400_000), "day");
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}
