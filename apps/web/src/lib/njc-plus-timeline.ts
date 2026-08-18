import type { PremiumTimelineSegmentInput } from "@/lib/njc-plus-contract";

export type PlayerTimelineSegment = PremiumTimelineSegmentInput & {
  id: string;
  source: "platform" | "content";
  playbackStartMs: number;
  playbackEndMs: number;
  skipToMs: number;
};

export type PlatformIntroPresentation = {
  id: string;
  title: string;
  src: string;
  durationMs: number;
  blackGapMs: number;
};

export function defaultSegmentLabel(type: PremiumTimelineSegmentInput["segmentType"]) {
  if (type === "intro") return "Skip Intro";
  if (type === "recap") return "Skip Recap";
  if (type === "credits") return "Skip Credits";
  return "Skip Segment";
}

export function composePlaybackTimeline(input: {
  contentSegments: Array<PremiumTimelineSegmentInput & { id: string }>;
  platformIntro?: PlatformIntroPresentation | null;
}): PlayerTimelineSegment[] {
  const offsetMs = input.platformIntro
    ? input.platformIntro.durationMs + input.platformIntro.blackGapMs
    : 0;
  const generated: PlayerTimelineSegment[] = input.platformIntro
    ? [{
        id: `platform:${input.platformIntro.id}`,
        segmentType: "intro",
        startMs: 0,
        endMs: input.platformIntro.durationMs,
        internalName: input.platformIntro.title,
        viewerLabel: "Skip Intro",
        skippable: true,
        sortOrder: -1,
        source: "platform",
        playbackStartMs: 0,
        playbackEndMs: input.platformIntro.durationMs,
        skipToMs: offsetMs,
      }]
    : [];
  return [
    ...generated,
    ...input.contentSegments.map((segment) => ({
      ...segment,
      viewerLabel: segment.skippable
        ? segment.viewerLabel || defaultSegmentLabel(segment.segmentType)
        : segment.viewerLabel,
      source: "content" as const,
      playbackStartMs: segment.startMs + offsetMs,
      playbackEndMs: segment.endMs + offsetMs,
      skipToMs: segment.endMs + offsetMs,
    })),
  ].sort((a, b) => a.playbackStartMs - b.playbackStartMs || a.sortOrder - b.sortOrder);
}

export function activeTimelineSegment(
  segments: PlayerTimelineSegment[],
  playbackPositionMs: number,
) {
  return segments.find(
    (segment) =>
      segment.skippable &&
      playbackPositionMs >= segment.playbackStartMs &&
      playbackPositionMs < segment.playbackEndMs,
  ) ?? null;
}

export function sourcePositionToPlaybackMs(sourcePositionMs: number, intro?: PlatformIntroPresentation | null) {
  return sourcePositionMs + (intro ? intro.durationMs + intro.blackGapMs : 0);
}

export function playbackPositionToSourceMs(playbackPositionMs: number, intro?: PlatformIntroPresentation | null) {
  return Math.max(0, playbackPositionMs - (intro ? intro.durationMs + intro.blackGapMs : 0));
}
