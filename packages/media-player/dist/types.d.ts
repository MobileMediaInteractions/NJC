import type { CSSProperties, ReactNode } from "react";
export type TimelineSegmentType = "intro" | "recap" | "chapter" | "credits" | "custom";
export type TimelineSegment = {
    id: string;
    segmentType: TimelineSegmentType;
    startMs: number;
    endMs: number;
    internalName?: string | null;
    viewerLabel?: string | null;
    skippable: boolean;
    sortOrder: number;
};
export type PlatformIntroPresentation = {
    id: string;
    title: string;
    src: string;
    durationMs: number;
    blackGapMs: number;
};
export type PlayerTimelineSegment = TimelineSegment & {
    source: "platform" | "content";
    playbackStartMs: number;
    playbackEndMs: number;
    skipToMs: number;
};
export type PlayerProgressEvent = {
    contentId: string;
    positionMs: number;
    durationMs: number;
    completed: boolean;
    reason: "interval" | "pause" | "ended" | "unmount";
};
export type PlayerEvent = {
    type: "phase_change";
    phase: "intro" | "gap" | "program";
} | {
    type: "segment_skipped";
    segment: PlayerTimelineSegment;
} | {
    type: "chapter_selected";
    segment: PlayerTimelineSegment;
} | {
    type: "media_error";
    phase: "intro" | "program";
    code?: number;
};
export type MediaPlayerLabels = {
    back: string;
    forward: string;
    play: string;
    pause: string;
    mute: string;
    unmute: string;
    speed: string;
    captions: string;
    chapters: string;
    pictureInPicture: string;
    fullscreen: string;
    loading: string;
    originalAudio: string;
    privatePreview: string;
};
export type MediaPlayerProps = {
    contentId: string;
    kind: "video" | "audio";
    src: string;
    title: string;
    poster?: string | null;
    captionsUrl?: string | null;
    initialPositionMs?: number;
    timelineSegments?: TimelineSegment[];
    platformIntro?: PlatformIntroPresentation | null;
    previewNotice?: {
        title?: string;
        body: string;
    } | null;
    branding?: {
        mark?: ReactNode;
        title?: string;
        subtitle?: string;
    };
    labels?: Partial<MediaPlayerLabels>;
    persistIntervalMs?: number;
    onProgress?: (event: PlayerProgressEvent) => void | Promise<void>;
    onEvent?: (event: PlayerEvent) => void;
    className?: string;
    style?: CSSProperties;
};
export type TimelineValidationIssue = {
    segmentId: string;
    field: "startMs" | "endMs" | "internalName" | "viewerLabel" | "overlap";
    message: string;
    severity: "error" | "warning";
};
export type TimelineEditorProps = {
    segments: TimelineSegment[];
    mediaUrl?: string | null;
    durationMs?: number | null;
    inheritedIntro?: Pick<PlatformIntroPresentation, "title" | "durationMs" | "blackGapMs"> | null;
    allowedTypes?: TimelineSegmentType[];
    onChange: (segments: TimelineSegment[]) => void;
    onSave?: (segments: TimelineSegment[]) => void | Promise<void>;
    onDiscard?: () => void;
    dirty?: boolean;
    busy?: boolean;
    statusMessage?: string | null;
    readOnly?: boolean;
    className?: string;
};
//# sourceMappingURL=types.d.ts.map