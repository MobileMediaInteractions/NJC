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

export type PlayerEvent =
  | { type: "phase_change"; phase: "intro" | "gap" | "program" }
  | { type: "segment_skipped"; segment: PlayerTimelineSegment }
  | { type: "chapter_selected"; segment: PlayerTimelineSegment }
  | { type: "media_error"; phase: "intro" | "program"; code?: number };

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
  closeChapters: string;
  playbackPosition: string;
  skipSegment: string;
  transitionToProgram: string;
  chapterFallback: string;
};

export type MediaControlId =
  | "seek-backward"
  | "play-pause"
  | "seek-forward"
  | "time"
  | "volume"
  | "speed"
  | "chapters"
  | "captions"
  | "picture-in-picture"
  | "fullscreen";

export type MediaPlayerFeatureConfig = {
  platformIntro: boolean;
  skipSegments: boolean;
  scrubber: boolean;
  seekBackward: boolean;
  playPause: boolean;
  seekForward: boolean;
  time: boolean;
  volume: boolean;
  playbackSpeed: boolean;
  chapters: boolean;
  captions: boolean;
  pictureInPicture: boolean;
  fullscreen: boolean;
  previewNotice: boolean;
  audioBranding: boolean;
  progressPersistence: boolean;
};

export type MediaPlayerClassNames = {
  root: string;
  media: string;
  gap: string;
  notice: string;
  skip: string;
  loading: string;
  audioIdentity: string;
  chapters: string;
  controls: string;
  scrubber: string;
  controlRow: string;
  time: string;
};

export type MediaPlayerSlotContext = {
  title: string;
  phase: "intro" | "gap" | "program";
  playing: boolean;
};

export type MediaPlayerSlots = {
  loading?: (context: MediaPlayerSlotContext) => ReactNode;
  previewNotice?: (context: MediaPlayerSlotContext & { notice: NonNullable<MediaPlayerProps["previewNotice"]> }) => ReactNode;
  skipButton?: (context: MediaPlayerSlotContext & { segment: PlayerTimelineSegment; onSkip: () => void }) => ReactNode;
  audioIdentity?: (context: MediaPlayerSlotContext & { branding?: MediaPlayerProps["branding"] }) => ReactNode;
  beforeControls?: ReactNode;
  afterControls?: ReactNode;
  control?: (context: { id: MediaControlId; label: string; active: boolean; onPress: () => void; defaultControl: ReactNode }) => ReactNode;
};

export type CaptionTrack = {
  src: string;
  srcLang: string;
  label: string;
  default?: boolean;
};

export type MediaPlayerProps = {
  contentId: string;
  kind: "video" | "audio";
  src: string;
  title: string;
  poster?: string | null;
  captionsUrl?: string | null;
  captionTracks?: CaptionTrack[];
  initialPositionMs?: number;
  timelineSegments?: TimelineSegment[];
  platformIntro?: PlatformIntroPresentation | null;
  previewNotice?: { title?: string; body: string } | null;
  branding?: { mark?: ReactNode; title?: string; subtitle?: string };
  labels?: Partial<MediaPlayerLabels>;
  features?: Partial<MediaPlayerFeatureConfig>;
  controlOrder?: MediaControlId[];
  playbackRates?: number[];
  seekStepSeconds?: number;
  classNames?: Partial<MediaPlayerClassNames>;
  slots?: MediaPlayerSlots;
  controlsAriaLabel?: string;
  ariaLabel?: string;
  preload?: "none" | "metadata" | "auto";
  crossOrigin?: "anonymous" | "use-credentials";
  persistIntervalMs?: number;
  dataAdapter?: Pick<MediaDataAdapter, "saveProgress">;
  onProgress?: (event: PlayerProgressEvent) => void | Promise<void>;
  onEvent?: (event: PlayerEvent) => void;
  className?: string;
  style?: CSSProperties;
};

export type TimelineEditorLabels = {
  eyebrow: string;
  title: string;
  description: string;
  inheritedPresentation: string;
  inheritedHelp: string;
  emptyPreview: string;
  sourceTimeline: string;
  zoom: string;
  overlapReview: string;
  resolveBeforeSaving: string;
  idleStatus: string;
  discard: string;
  save: string;
  saving: string;
};

export type TimelineEditorFeatureConfig = {
  header: boolean;
  inheritedIntro: boolean;
  mediaPreview: boolean;
  zoom: boolean;
  addControls: boolean;
  inspector: boolean;
  validation: boolean;
  actions: boolean;
};

export type TimelineEditorClassNames = {
  root: string;
  header: string;
  inherited: string;
  preview: string;
  emptyPreview: string;
  trackHeading: string;
  trackScroll: string;
  track: string;
  addControls: string;
  inspector: string;
  footer: string;
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
  classNames?: Partial<TimelineEditorClassNames>;
  labels?: Partial<TimelineEditorLabels>;
  features?: Partial<TimelineEditorFeatureConfig>;
  style?: CSSProperties;
};

export type MediaPresentation = {
  id: string;
  kind: "video" | "audio";
  title: string;
  src: string;
  poster?: string | null;
  captionsUrl?: string | null;
  timelineSegments?: TimelineSegment[];
  platformIntro?: PlatformIntroPresentation | null;
  initialPositionMs?: number;
  metadata?: Record<string, unknown>;
};

export type MediaDataAdapter = {
  loadPresentation?: (idOrSlug: string) => Promise<MediaPresentation>;
  saveProgress?: (event: PlayerProgressEvent) => Promise<void>;
  loadTimeline?: (contentId: string) => Promise<TimelineSegment[]>;
  saveTimeline?: (contentId: string, segments: TimelineSegment[]) => Promise<TimelineSegment[]>;
};
