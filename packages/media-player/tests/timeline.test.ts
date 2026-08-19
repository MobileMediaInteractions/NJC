import assert from "node:assert/strict";
import test from "node:test";
import { activeTimelineSegment, composePlaybackTimeline, playbackPositionToSourceMs, sourcePositionToPlaybackMs, validateTimeline } from "../src/timeline";
import type { PlatformIntroPresentation, TimelineSegment } from "../src/types";

const intro: PlatformIntroPresentation = { id: "ident", title: "Platform ident", src: "https://media.example/ident.mp4", durationMs: 8_000, blackGapMs: 2_500 };
const segments: TimelineSegment[] = [
  { id: "recap", segmentType: "recap", startMs: 0, endMs: 30_000, internalName: "Previously", viewerLabel: null, skippable: true, sortOrder: 0 },
  { id: "chapter", segmentType: "chapter", startMs: 30_000, endMs: 90_000, internalName: "Opening case", viewerLabel: "Opening case", skippable: false, sortOrder: 1 },
];

test("composes inherited presentation without mutating source markers", () => {
  const composed = composePlaybackTimeline({ contentSegments: segments, platformIntro: intro });
  assert.equal(composed[0]?.source, "platform");
  assert.equal(composed[0]?.skipToMs, 10_500);
  assert.equal(composed[1]?.playbackStartMs, 10_500);
  assert.equal(segments[0]?.startMs, 0);
});

test("finds contextual skip ranges and keeps chapters non-skippable", () => {
  const composed = composePlaybackTimeline({ contentSegments: segments, platformIntro: intro });
  assert.equal(activeTimelineSegment(composed, 2_000)?.viewerLabel, "Skip Intro");
  assert.equal(activeTimelineSegment(composed, 20_000)?.viewerLabel, "Skip Recap");
  assert.equal(activeTimelineSegment(composed, 50_000), null);
});

test("converts source and presentation progress around an intro", () => {
  assert.equal(sourcePositionToPlaybackMs(15_000, intro), 25_500);
  assert.equal(playbackPositionToSourceMs(25_500, intro), 15_000);
});

test("validates invalid ranges, labels and source duration", () => {
  const issues = validateTimeline([
    { id: "bad", segmentType: "custom", startMs: 2_000, endMs: 1_000, internalName: "", viewerLabel: "", skippable: true, sortOrder: 0 },
  ], 1_500);
  assert.ok(issues.some((issue) => issue.field === "endMs"));
  assert.ok(issues.some((issue) => issue.field === "internalName"));
  assert.ok(issues.some((issue) => issue.field === "viewerLabel"));
});

test("reports overlaps as review warnings rather than authorization errors", () => {
  const issues = validateTimeline([
    ...segments,
    { id: "overlay", segmentType: "custom", startMs: 20_000, endMs: 40_000, internalName: "Sponsor slate", viewerLabel: null, skippable: false, sortOrder: 2 },
  ], 100_000);
  assert.ok(issues.some((issue) => issue.field === "overlap" && issue.severity === "warning"));
  assert.equal(issues.some((issue) => issue.field === "overlap" && issue.severity === "error"), false);
});
