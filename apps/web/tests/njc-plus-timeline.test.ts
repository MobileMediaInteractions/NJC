import assert from "node:assert/strict";
import test from "node:test";
import { activeTimelineSegment, composePlaybackTimeline, playbackPositionToSourceMs, sourcePositionToPlaybackMs } from "../src/lib/njc-plus-timeline";
import { premiumPreviewConfigurationInput, premiumTimelineSegmentInput } from "../src/lib/njc-plus-contract";
import { nextPreviewViewingStatus, validatePreviewAnswers } from "../src/lib/njc-plus-preview-policy";

const intro = { id: "ident-a", title: "NJC+ 2026 ident", src: "https://example.com/ident.mp4", durationMs: 8_000, blackGapMs: 2_500 };
const sourceSegments = [
  { id: "recap", segmentType: "recap" as const, startMs: 0, endMs: 60_000, internalName: "Previously on", viewerLabel: null, skippable: true, sortOrder: 0 },
  { id: "intro", segmentType: "intro" as const, startMs: 60_000, endMs: 90_000, internalName: "Episode titles", viewerLabel: null, skippable: true, sortOrder: 1 },
];

test("composes a platform intro without mutating source markers", () => {
  const composed = composePlaybackTimeline({ contentSegments: sourceSegments, platformIntro: intro });
  assert.deepEqual(sourceSegments.map((item) => [item.startMs, item.endMs]), [[0, 60_000], [60_000, 90_000]]);
  assert.equal(composed[0]?.source, "platform");
  assert.equal(composed[0]?.skipToMs, 10_500);
  assert.equal(composed[1]?.playbackStartMs, 10_500);
  assert.equal(composed[1]?.playbackEndMs, 70_500);
  assert.equal(composed[2]?.playbackStartMs, 70_500);
});

test("changing global intro duration recalculates offsets only", () => {
  const first = composePlaybackTimeline({ contentSegments: sourceSegments, platformIntro: intro });
  const second = composePlaybackTimeline({ contentSegments: sourceSegments, platformIntro: { ...intro, id: "ident-b", durationMs: 11_000 } });
  assert.equal(second[1]!.playbackStartMs - first[1]!.playbackStartMs, 3_000);
  assert.equal(sourceSegments[0]!.startMs, 0);
});

test("active skip controls follow seeking in and out of segments", () => {
  const composed = composePlaybackTimeline({ contentSegments: sourceSegments, platformIntro: intro });
  assert.equal(activeTimelineSegment(composed, 2_000)?.viewerLabel, "Skip Intro");
  assert.equal(activeTimelineSegment(composed, 9_000), null);
  assert.equal(activeTimelineSegment(composed, 20_000)?.viewerLabel, "Skip Recap");
  assert.equal(activeTimelineSegment(composed, 101_000), null);
});

test("source and presentation progress translate around inherited media", () => {
  assert.equal(sourcePositionToPlaybackMs(15_000, intro), 25_500);
  assert.equal(playbackPositionToSourceMs(25_500, intro), 15_000);
  assert.equal(playbackPositionToSourceMs(4_000, intro), 0);
});

test("timeline contracts reject invalid and unlabeled custom ranges", () => {
  assert.equal(premiumTimelineSegmentInput.safeParse({ segmentType: "custom", startMs: 1000, endMs: 500, skippable: true, sortOrder: 0 }).success, false);
  assert.equal(premiumTimelineSegmentInput.safeParse({ segmentType: "custom", startMs: 0, endMs: 1000, internalName: "Intermission", viewerLabel: "Skip Intermission", skippable: true, sortOrder: 0 }).success, true);
});

test("preview configuration validates dates and structured questions", () => {
  assert.equal(premiumPreviewConfigurationInput.safeParse({ enabled: true, disclaimer: "This private preview is unfinished and must not be distributed outside the invited review group.", opensAt: "2026-08-20T12:00:00.000Z", expiresAt: "2026-08-19T12:00:00.000Z", questions: [] }).success, false);
  assert.equal(premiumPreviewConfigurationInput.safeParse({ enabled: true, disclaimer: "This private preview is unfinished and must not be distributed outside the invited review group.", questions: [{ prompt: "Which ending worked best?", questionType: "multiple_choice", required: true, options: ["First", "Second"], sortOrder: 0 }] }).success, true);
});

test("preview feedback is constrained by the stored question type and options", () => {
  const questions = [
    { id: "11111111-1111-4111-8111-111111111111", questionType: "multiple_choice", required: true, options: ["First", "Second"] },
    { id: "22222222-2222-4222-8222-222222222222", questionType: "rating", required: false, options: [] },
  ];
  assert.equal(validatePreviewAnswers(questions, [{ questionId: questions[0]!.id, value: "First" }]), null);
  assert.match(validatePreviewAnswers(questions, [{ questionId: questions[0]!.id, value: "Invented" }]) ?? "", /available/);
  assert.match(validatePreviewAnswers(questions, [{ questionId: questions[0]!.id, value: "First" }, { questionId: questions[1]!.id, value: 6 }]) ?? "", /1 to 5/);
  assert.match(validatePreviewAnswers(questions, []) ?? "", /required/);
});

test("feedback-submitted and completed viewing states never regress", () => {
  assert.equal(nextPreviewViewingStatus({ currentStatus: "feedback_submitted", completedAt: new Date(), completedNow: false }), "feedback_submitted");
  assert.equal(nextPreviewViewingStatus({ currentStatus: "viewed", completedAt: new Date(), completedNow: false }), "viewed");
  assert.equal(nextPreviewViewingStatus({ currentStatus: "invited", completedAt: null, completedNow: false }), "viewing");
});
