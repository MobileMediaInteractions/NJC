"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  GitCompareArrows,
  History,
  Loader2,
  RotateCcw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildStoryRevisionDiff,
  type StoryDiffLine,
  type StoryDiffToken,
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

type CompareMode = "unified" | "side-by-side";

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
      <RevisionWorkbench
        storyId={storyId}
        liveSnapshot={liveSnapshot}
        revisions={revisions}
        canRestore={canReview}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" /> Revision timeline
          </CardTitle>
          <CardDescription>
            Meaningful saves and workflow events are retained with the editor,
            review decision and complete snapshot. Opening a story creates no revision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length ? (
            history.map((revision) => (
              <RevisionHistoryItem
                key={revision.id}
                storyId={storyId}
                revision={revision}
                canRestore={canReview}
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

function RevisionWorkbench({
  storyId,
  liveSnapshot,
  revisions,
  canRestore,
}: {
  storyId: string;
  liveSnapshot: StoryRevisionSnapshot;
  revisions: StoryRevisionRow[];
  canRestore: boolean;
}) {
  const options = useMemo(
    () => [
      { id: "live", label: "Current newsroom state", snapshot: liveSnapshot },
      ...revisions.map((revision) => ({
        id: revision.id,
        label: `Revision ${revision.version} · ${revision.editorName} · ${shortDate(revision.createdAt)}`,
        snapshot: revision.snapshot,
      })),
    ],
    [liveSnapshot, revisions],
  );
  const firstDifferent = revisions.find(
    (revision) => buildStoryRevisionDiff(revision.snapshot, liveSnapshot).length,
  );
  const [olderId, setOlderId] = useState(firstDifferent?.id ?? revisions[0]?.id ?? "live");
  const [newerId, setNewerId] = useState("live");
  const [mode, setMode] = useState<CompareMode>("unified");
  const older = options.find((option) => option.id === olderId) ?? options[0]!;
  const newer = options.find((option) => option.id === newerId) ?? options[0]!;
  const changes = buildStoryRevisionDiff(older.snapshot, newer.snapshot);
  const published = revisions.find(
    (revision) =>
      revision.reviewStatus === "applied" && revision.snapshot.status === "published",
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-5" /> Compare revisions
            </CardTitle>
            <CardDescription className="mt-1">
              Compare any retained snapshots, including non-consecutive revisions
              and the newsroom state currently visible above.
            </CardDescription>
          </div>
          {published ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOlderId(published.id);
                setNewerId("live");
              }}
            >
              Changes since published
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end">
          <RevisionSelect label="Older / base" value={olderId} onChange={setOlderId} options={options} />
          <span className="hidden pb-2 text-muted-foreground lg:block" aria-hidden="true">→</span>
          <RevisionSelect label="Newer / comparison" value={newerId} onChange={setNewerId} options={options} />
          <div className="flex rounded-lg border p-1" aria-label="Comparison layout">
            <Button type="button" size="sm" variant={mode === "unified" ? "secondary" : "ghost"} aria-pressed={mode === "unified"} onClick={() => setMode("unified")}>Unified</Button>
            <Button type="button" size="sm" variant={mode === "side-by-side" ? "secondary" : "ghost"} aria-pressed={mode === "side-by-side"} onClick={() => setMode("side-by-side")}>Side by side</Button>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
          Comparing <strong className="text-foreground">{older.label}</strong> to <strong className="text-foreground">{newer.label}</strong>. Additions and removals use both symbols and color.
        </div>
        <RevisionDiff changes={changes} mode={mode} />
        {canRestore && older.id !== "live" ? (
          <RestoreRevision storyId={storyId} revisionId={older.id} version={revisions.find((revision) => revision.id === older.id)?.version ?? 0} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function RevisionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
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
    const required = action === "approve" ? "APPROVE UPDATE" : "REJECT UPDATE";
    if (confirmation !== required) {
      setMessage(`Type ${required} exactly before continuing.`);
      return;
    }
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/v1/studio/stories/${encodeURIComponent(storyId)}/revisions/${encodeURIComponent(revision.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note, confirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? `The revision could not be ${action === "approve" ? "approved" : "rejected"}.`);
        return;
      }
      setMessage(action === "approve" ? "The approved update is now live." : "The update was rejected and retained in history.");
      router.refresh();
    });
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-amber-600" /> Live update awaiting approval</CardTitle>
            <CardDescription className="mt-1">Version {revision.version}, submitted by {revision.editorName} {formatWhen(revision.createdAt)}. The public story has not changed.</CardDescription>
          </div>
          <Badge className="bg-amber-500 text-black">Pending review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <RevisionDiff changes={changes} mode="unified" />
        {canReview ? (
          <div className="grid gap-4 rounded-xl border bg-background p-4 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-2"><Label htmlFor={`revision-note-${revision.id}`}>Editorial review note</Label><Textarea id={`revision-note-${revision.id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional approval context or required correction" /></div>
            <div className="space-y-2"><Label htmlFor={`revision-confirmation-${revision.id}`}>Manual verification</Label><Input id={`revision-confirmation-${revision.id}`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="APPROVE UPDATE or REJECT UPDATE" autoComplete="off" /><div className="grid grid-cols-2 gap-2"><Button onClick={() => review("approve")} disabled={pending || confirmation !== "APPROVE UPDATE"}>{pending ? <Loader2 className="animate-spin" /> : <Check />} Approve</Button><Button variant="destructive" onClick={() => review("reject")} disabled={pending || confirmation !== "REJECT UPDATE"}><X /> Reject</Button></div></div>
          </div>
        ) : (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">{revision.editorIsViewer ? "A different publisher must review this update." : "Publisher access is required to resolve this update."}</p>
        )}
        {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

function RevisionHistoryItem({
  storyId,
  revision,
  changes,
  canRestore,
}: {
  storyId: string;
  revision: StoryRevisionRow;
  changes: StoryFieldChange[];
  canRestore: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-lg border">
      <button type="button" className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
        <span className="min-w-0 flex-1"><strong className="block truncate">Revision {revision.version} · {revision.note ?? "Editorial snapshot"}</strong><span className="mt-1 block text-xs text-muted-foreground">{revision.editorName} · {formatWhen(revision.createdAt)}{revision.reviewerName ? ` · reviewed by ${revision.reviewerName}` : ""}</span></span>
        <Badge variant={revision.reviewStatus === "rejected" ? "destructive" : "secondary"} className="capitalize">{revision.reviewStatus}</Badge>
      </button>
      {open ? (
        <div className="space-y-4 border-t p-4">
          <RevisionDiff changes={changes} mode="unified" />
          {revision.reviewNote ? <p className="rounded-md bg-muted p-3 text-sm">{revision.reviewNote}</p> : null}
          {canRestore ? <RestoreRevision storyId={storyId} revisionId={revision.id} version={revision.version} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function RestoreRevision({ storyId, revisionId, version }: { storyId: string; revisionId: string; version: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function restore() {
    if (confirmation !== "RESTORE REVISION" || reason.trim().length < 10) return;
    startTransition(async () => {
      const response = await fetch(`/api/v1/studio/stories/${encodeURIComponent(storyId)}/revisions/${encodeURIComponent(revisionId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore", confirmation, note: reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "The revision could not be restored.");
        return;
      }
      setMessage(payload?.meta?.requiresReview ? "Restoration submitted for independent approval." : "Revision restored as a new draft revision.");
      setConfirmation("");
      router.refresh();
    });
  }

  if (!open) {
    return <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}><RotateCcw /> Restore revision {version}</Button>;
  }
  return (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div><p className="font-semibold">Restore revision {version} as a new revision?</p><p className="mt-1 text-xs leading-5 text-muted-foreground">History will not be erased. Pre-publication content returns to Draft; an active published story creates an independently reviewed update.</p></div>
      <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this restoration is required (minimum 10 characters)" maxLength={500} />
      <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Type RESTORE REVISION" autoComplete="off" />
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={restore} disabled={pending || confirmation !== "RESTORE REVISION" || reason.trim().length < 10}>{pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Confirm restoration</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button></div>
      {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function RevisionDiff({ changes, mode }: { changes: StoryFieldChange[]; mode: CompareMode }) {
  if (!changes.length) return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">These snapshots contain no editorial content or metadata differences.</p>;
  return (
    <div className="space-y-4" aria-label="Revision differences">
      {changes.map((change) => (
        <div key={change.field} className="overflow-hidden rounded-lg border">
          <div className="border-b bg-muted/50 px-4 py-2 text-xs font-black uppercase tracking-wider">{change.label}</div>
          {change.lines ? <LineDiff lines={change.lines} mode={mode} /> : <div className={mode === "side-by-side" ? "grid md:grid-cols-2" : "grid md:grid-cols-2"}><DiffValue label="− Before" value={change.before} removed /><DiffValue label="+ After" value={change.after} /></div>}
        </div>
      ))}
    </div>
  );
}

function LineDiff({ lines, mode }: { lines: StoryDiffLine[]; mode: CompareMode }) {
  if (mode === "side-by-side") {
    return (
      <div className="grid bg-[#081c15] font-mono text-xs text-white md:grid-cols-2" role="table" aria-label="Side-by-side content changes">
        <div className="border-b border-white/10 md:border-b-0 md:border-r"><p className="border-b border-white/10 px-3 py-2 font-sans font-bold text-white/65">Previous</p>{lines.filter((line) => line.kind !== "added").map((line, index) => <DiffLine key={index} line={line} side="before" />)}</div>
        <div><p className="border-b border-white/10 px-3 py-2 font-sans font-bold text-white/65">Current</p>{lines.filter((line) => line.kind !== "removed").map((line, index) => <DiffLine key={index} line={line} side="after" />)}</div>
      </div>
    );
  }
  return <div className="max-h-[32rem] overflow-auto bg-[#081c15] font-mono text-xs text-white" role="list" aria-label="Unified content changes">{lines.map((line, index) => <DiffLine key={index} line={line} />)}</div>;
}

function DiffLine({ line, side }: { line: StoryDiffLine; side?: "before" | "after" }) {
  const marker = line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " ";
  const visibleTokens = line.tokens?.filter((token) => side !== "before" ? token.kind !== "removed" : token.kind !== "added");
  return (
    <div role="listitem" aria-label={line.kind === "same" ? "Unchanged" : line.kind === "added" ? "Added" : "Removed"} className={line.kind === "added" ? "bg-emerald-500/18 text-emerald-100" : line.kind === "removed" ? "bg-red-500/18 text-red-100" : "text-white/55"}>
      <span aria-hidden="true" className="inline-block w-8 select-none border-r border-white/10 px-2 py-1 text-center text-white/45">{marker}</span>
      <span className="whitespace-pre-wrap break-words px-3 py-1">{visibleTokens?.length ? visibleTokens.map((token, index) => <DiffToken key={index} token={token} />) : line.value || " "}</span>
    </div>
  );
}

function DiffToken({ token }: { token: StoryDiffToken }) {
  const changed = token.kind !== "same";
  return <span className={changed ? token.kind === "added" ? "rounded-sm bg-emerald-300/35 text-white" : "rounded-sm bg-red-300/35 text-white line-through decoration-red-200/80" : ""}>{token.value}</span>;
}

function DiffValue({ label, value, removed = false }: { label: string; value: string; removed?: boolean }) {
  const image = /^https?:\/\/.+\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(value);
  return <div className={`min-w-0 p-4 ${removed ? "bg-red-500/8" : "bg-emerald-500/8"}`}><p className="text-[0.65rem] font-black uppercase tracking-wider text-muted-foreground">{label}</p>{image ? <Image src={value} alt="Revision media preview" width={480} height={270} className="mt-3 aspect-video max-w-sm rounded-md border object-cover" /> : <p className="mt-2 whitespace-pre-wrap break-words text-sm">{value || "None"}</p>}</div>;
}

function baseSnapshot(revision: StoryRevisionRow, revisions: StoryRevisionRow[]) {
  if (revision.baseVersion !== null) {
    const explicit = revisions.find((candidate) => candidate.version === revision.baseVersion);
    if (explicit) return explicit.snapshot;
  }
  const previous = revisions.filter((candidate) => candidate.version < revision.version && candidate.reviewStatus === "applied").sort((left, right) => right.version - left.version)[0];
  return previous?.snapshot ?? {};
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}

function formatWhen(value: string) {
  const deltaMs = new Date(value).getTime() - Date.now();
  const absoluteMs = Math.abs(deltaMs);
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (absoluteMs < 60 * 60 * 1_000) return relative.format(Math.round(deltaMs / 60_000), "minute");
  if (absoluteMs < 7 * 24 * 60 * 60 * 1_000) return relative.format(Math.round(deltaMs / 3_600_000), "hour");
  if (absoluteMs < 45 * 24 * 60 * 60 * 1_000) return relative.format(Math.round(deltaMs / 86_400_000), "day");
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(value));
}
