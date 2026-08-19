"use client";

import { MediaPlayer, type PlatformIntroPresentation, type TimelineSegment } from "@harborline/media-player";
import type { PremiumTimelineSegmentInput } from "@/lib/njc-plus-contract";

type Props = {
  contentId: string;
  kind: "video" | "audio";
  src: string;
  poster?: string | null;
  captionsUrl?: string | null;
  title: string;
  initialPositionMs?: number;
  timelineSegments?: Array<PremiumTimelineSegmentInput & { id: string }>;
  platformIntro?: PlatformIntroPresentation | null;
  previewDisclaimer?: string | null;
};

export function NjcPlusMediaPlayer({ contentId, kind, src, poster, captionsUrl, title, initialPositionMs = 0, timelineSegments = [], platformIntro = null, previewDisclaimer = null }: Props) {
  return (
    <MediaPlayer
      contentId={contentId}
      kind={kind}
      src={src}
      poster={poster}
      captionsUrl={captionsUrl}
      title={title}
      initialPositionMs={initialPositionMs}
      timelineSegments={timelineSegments as TimelineSegment[]}
      platformIntro={platformIntro}
      previewNotice={previewDisclaimer ? { title: "Private Preview", body: previewDisclaimer } : null}
      branding={{ title: "NJC+", subtitle: "Original audio" }}
      style={{
        "--harbor-media-accent": "var(--plus-signal)",
        "--harbor-media-ink": "var(--plus-ink)",
        "--harbor-media-muted": "var(--plus-muted)",
      } as React.CSSProperties}
      onProgress={async (progress) => {
        await fetch("/api/v1/plus/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId: progress.contentId,
            positionMs: progress.positionMs,
            durationMs: progress.durationMs,
            completed: progress.completed,
            devicePlatform: "web",
          }),
          keepalive: true,
        });
      }}
    />
  );
}
