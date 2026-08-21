"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MessageSquareQuote,
  Pin,
  RefreshCw,
  Share2,
  Signal,
  Trophy,
} from "lucide-react";
import type {
  LiveCoverageDetail,
  LiveCoverageUpdate,
  LiveUpdateKind,
} from "@harborline/contracts";
import { Button } from "@/components/ui/button";
import { mergeLiveCoverageSnapshot } from "@/lib/live-coverage-client";

const kindPresentation: Record<
  LiveUpdateKind,
  { label: string; icon: typeof CircleDot; className: string }
> = {
  update: { label: "Update", icon: CircleDot, className: "text-brand-blue" },
  breaking: { label: "Breaking", icon: AlertTriangle, className: "text-brand-red" },
  result: { label: "Result", icon: Trophy, className: "text-emerald-700 dark:text-emerald-400" },
  quote: { label: "On the record", icon: MessageSquareQuote, className: "text-violet-700 dark:text-violet-300" },
  context: { label: "Context", icon: Clock3, className: "text-amber-700 dark:text-amber-300" },
  media: { label: "Watch", icon: Signal, className: "text-cyan-700 dark:text-cyan-300" },
  correction: { label: "Correction", icon: CheckCircle2, className: "text-orange-700 dark:text-orange-300" },
};

export function LiveCoverageTimeline({
  initialEvent,
}: {
  initialEvent: LiveCoverageDetail;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [connection, setConnection] = useState<"connected" | "refreshing" | "offline" | "error">("connected");
  const [unseen, setUnseen] = useState(0);
  const [message, setMessage] = useState("");
  const latestKnown = useRef(initialEvent.updatedAt);
  const headingRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (announce = false) => {
    if (document.visibilityState === "hidden") return;
    setConnection(navigator.onLine ? "refreshing" : "offline");
    try {
      const response = await fetch(
        `/api/v1/live/coverage/${encodeURIComponent(initialEvent.slug)}?after=${encodeURIComponent(latestKnown.current)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        data?: LiveCoverageDetail;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Live updates are unavailable");
      }
      const nextEvent = payload.data;
      const incoming = nextEvent.updates;
      const removedCount = nextEvent.removedUpdateIds.length;
      setEvent((current) => mergeLiveCoverageSnapshot(current, nextEvent));
      latestKnown.current = nextEvent.updatedAt;
      if (incoming.length) {
        setUnseen((current) => current + incoming.length);
        if (announce) setMessage(`${incoming.length} new live update${incoming.length === 1 ? "" : "s"} received.`);
      } else if (removedCount && announce) {
        setMessage(`${removedCount} live update${removedCount === 1 ? " was" : "s were"} withdrawn from the public timeline.`);
      }
      setConnection("connected");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Live updates are unavailable");
      setConnection(navigator.onLine ? "error" : "offline");
    }
  }, [initialEvent.slug]);

  useEffect(() => {
    if (!(["live", "paused"] as string[]).includes(event.status)) return;
    const timer = window.setInterval(() => void refresh(true), 8_000);
    const online = () => void refresh(true);
    const offline = () => setConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [event.status, refresh]);

  const updates = useMemo(
    () => [...event.updates].sort((left, right) => {
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    }),
    [event.updates],
  );

  function showNewUpdates() {
    setUnseen(0);
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function share() {
    const shareData = { title: event.title, text: event.description ?? undefined, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Live coverage link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("The live coverage link could not be shared.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section aria-labelledby="live-timeline-heading" className="min-w-0">
        <div ref={headingRef} className="scroll-mt-28 border-b-4 border-brand-navy pb-4 dark:border-foreground">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-brand-red">Chronological reporting</p>
              <h2 id="live-timeline-heading" className="mt-1 text-3xl font-black tracking-[-0.045em] text-brand-navy dark:text-foreground">
                Latest updates
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionState state={connection} />
              <Button variant="outline" size="sm" onClick={() => void refresh(true)} disabled={connection === "refreshing"}>
                <RefreshCw className={connection === "refreshing" ? "animate-spin" : ""} /> Refresh
              </Button>
            </div>
          </div>
        </div>

        {unseen > 0 ? (
          <button
            type="button"
            onClick={showNewUpdates}
            className="sticky top-20 z-20 mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-red px-5 py-3 text-sm font-black text-white shadow-lg lg:top-4"
          >
            <BellRing className="size-4" /> Show {unseen} new update{unseen === 1 ? "" : "s"}
          </button>
        ) : null}

        <div className="relative mt-7 space-y-6 before:absolute before:bottom-4 before:left-[1.05rem] before:top-4 before:w-px before:bg-border sm:before:left-[1.3rem]">
          {updates.map((update) => <TimelineEntry key={update.id} update={update} />)}
          {!updates.length ? (
            <div className="relative border bg-card px-6 py-12 text-center">
              <Clock3 className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 text-xl font-black text-brand-navy dark:text-foreground">The live desk is standing by.</h3>
              <p className="mt-2 text-sm text-muted-foreground">Verified updates will appear here as the newsroom publishes them.</p>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="border-t-4 border-brand-yellow bg-brand-navy p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-yellow">Live desk</p>
          <p className="mt-3 text-3xl font-black">{event.updateCount}</p>
          <p className="text-sm text-white/65">published update{event.updateCount === 1 ? "" : "s"}</p>
          <Button type="button" variant="outline" onClick={() => void share()} className="mt-5 w-full border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Share2 /> Share coverage
          </Button>
        </div>
        <div className="border bg-card p-5 text-sm leading-6 text-muted-foreground">
          <p className="font-black text-brand-navy dark:text-foreground">How this works</p>
          <p className="mt-2">Updates are published by the Courier newsroom and refresh automatically while this desk is active. Corrections remain labeled.</p>
        </div>
      </aside>

      <p className="sr-only" aria-live="polite" role="status">{message}</p>
    </div>
  );
}

function TimelineEntry({ update }: { update: LiveCoverageUpdate }) {
  const presentation = kindPresentation[update.kind];
  const Icon = presentation.icon;
  return (
    <article className="relative grid grid-cols-[2.15rem_minmax(0,1fr)] gap-4 sm:grid-cols-[2.65rem_minmax(0,1fr)] sm:gap-5" data-live-update-id={update.id}>
      <div className={`relative z-10 grid size-9 place-items-center rounded-full border-4 border-background bg-card shadow-sm sm:size-11 ${presentation.className}`}>
        <Icon className="size-4 sm:size-5" />
      </div>
      <div className={`min-w-0 border bg-card p-5 shadow-sm sm:p-6 ${update.isPinned ? "border-brand-yellow ring-1 ring-brand-yellow/35" : ""}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`text-[0.65rem] font-black uppercase tracking-[0.15em] ${presentation.className}`}>{presentation.label}</span>
          {update.isPinned ? <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground"><Pin className="size-3" /> Pinned</span> : null}
          <time dateTime={update.publishedAt} className="ml-auto text-xs font-medium text-muted-foreground">{formatUpdateTime(update.publishedAt)}</time>
        </div>
        {update.headline ? <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.03em] text-brand-navy dark:text-foreground sm:text-2xl">{update.headline}</h3> : null}
        <div className="mt-3 space-y-3 text-[0.96rem] leading-7 text-foreground/85">
          {update.body.split(/\n{2,}/).map((paragraph, index) => <p key={`${update.id}-${index}`}>{paragraph}</p>)}
        </div>
        {update.mediaUrl ? (
          <figure className="mt-5 overflow-hidden border bg-muted">
            {/* Trusted newsroom HTTPS media is rendered directly so approved external wires remain usable. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={update.mediaUrl} alt={update.mediaAlt ?? "Live coverage media"} className="h-auto max-h-[34rem] w-full object-contain" loading="lazy" />
            {update.mediaAlt ? <figcaption className="border-t px-4 py-2 text-xs text-muted-foreground">{update.mediaAlt}</figcaption> : null}
          </figure>
        ) : null}
        {update.sourceUrl ? <a href={update.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:underline">{update.sourceLabel || "View source"}<ExternalLink className="size-3.5" /></a> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span className="grid size-7 place-items-center rounded-full bg-brand-navy font-black text-white">{update.author.initials}</span>
          <span>Reported by <strong className="text-foreground">{update.author.name}</strong></span>
          {update.correctedAt ? <span className="ml-auto font-bold text-orange-700 dark:text-orange-300">Corrected {formatUpdateTime(update.correctedAt)}</span> : null}
        </div>
      </div>
    </article>
  );
}

function ConnectionState({ state }: { state: "connected" | "refreshing" | "offline" | "error" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
      {state === "refreshing" ? <LoaderCircle className="size-3.5 animate-spin" /> : <span className={`size-2 rounded-full ${state === "connected" ? "bg-emerald-500" : state === "offline" ? "bg-amber-500" : "bg-brand-red"}`} />}
      {state === "connected" ? "Live connection" : state === "refreshing" ? "Checking" : state === "offline" ? "Offline" : "Retry needed"}
    </span>
  );
}

function formatUpdateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
