"use client";

import { useEffect, useMemo, useState } from "react";
import { TimelineEditor, type TimelineSegment } from "@harborline/media-player";
import type { PremiumTimelineSegmentInput } from "@/lib/njc-plus-contract";

type Segment = PremiumTimelineSegmentInput & { id: string };

export function NjcPlusTimelineEditor({ contentId, mediaUrl, durationMs, inheritedIntro }: {
  contentId: string;
  mediaUrl: string | null;
  durationMs: number | null;
  inheritedIntro?: { title: string; durationMs: number; blackGapMs: number } | null;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [savedSegments, setSavedSegments] = useState<Segment[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const changed = useMemo(() => JSON.stringify(segments) !== JSON.stringify(savedSegments), [savedSegments, segments]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/studio/njc-plus/content/${contentId}/timeline`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { data?: Segment[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Timeline could not be loaded.");
        const records = payload.data ?? [];
        setSegments(records);
        setSavedSegments(records);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMessage(error instanceof Error ? error.message : "Timeline could not be loaded.");
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [contentId]);

  async function save(next: TimelineSegment[]) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/studio/njc-plus/content/${contentId}/timeline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: next }),
      });
      const payload = await response.json() as { data?: Segment[]; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Timeline could not be saved.");
      const records = payload.data ?? [];
      setSegments(records);
      setSavedSegments(records);
      setMessage("Source timeline saved. Playback offsets will be calculated automatically.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Timeline could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TimelineEditor
      segments={segments as TimelineSegment[]}
      mediaUrl={mediaUrl}
      durationMs={durationMs}
      inheritedIntro={inheritedIntro}
      allowedTypes={["intro", "recap", "credits", "custom"]}
      onChange={(next) => setSegments(next as Segment[])}
      onSave={save}
      onDiscard={() => {
        setSegments(savedSegments);
        setMessage("Unsaved timeline changes were discarded.");
      }}
      dirty={changed}
      busy={busy}
      statusMessage={message || null}
      className="njc-plus-timeline-editor"
    />
  );
}
