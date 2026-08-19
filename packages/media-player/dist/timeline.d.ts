import type { PlatformIntroPresentation, PlayerTimelineSegment, TimelineSegment, TimelineSegmentType, TimelineValidationIssue } from "./types.js";
export declare function defaultSegmentLabel(type: TimelineSegmentType): "Skip Intro" | "Skip Recap" | "Skip Credits" | "Go to Chapter" | "Skip Segment";
export declare function composePlaybackTimeline(input: {
    contentSegments: TimelineSegment[];
    platformIntro?: PlatformIntroPresentation | null;
}): PlayerTimelineSegment[];
export declare function activeTimelineSegment(segments: PlayerTimelineSegment[], playbackPositionMs: number): PlayerTimelineSegment | null;
export declare function sourcePositionToPlaybackMs(sourcePositionMs: number, intro?: PlatformIntroPresentation | null): number;
export declare function playbackPositionToSourceMs(playbackPositionMs: number, intro?: PlatformIntroPresentation | null): number;
export declare function validateTimeline(segments: TimelineSegment[], durationMs?: number | null): TimelineValidationIssue[];
export declare function formatMediaTime(valueMs: number, includeMilliseconds?: boolean): string;
//# sourceMappingURL=timeline.d.ts.map