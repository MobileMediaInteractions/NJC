import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPodcastWaveform,
  findEpisodeMoment,
  twoDudesEpisodeSchema,
  twoDudesInWheelsSeries,
} from "../src/lib/two-dudes-in-wheels";

const validEpisode = {
  id: "e14bf0df-b403-4c90-8dbb-160a79f30ed4",
  slug: "the-first-drive",
  episodeNumber: 1,
  title: "The first drive from both seats",
  description: "A complete driver and passenger assessment of the same vehicle.",
  audioUrl: "/assets/podcasts/episode-one.mp3",
  durationMs: 600_000,
  publishedAt: "2026-09-15T16:00:00.000Z",
  car: { year: 2026, make: "Example", model: "Vehicle" },
  waveform: Array.from({ length: 48 }, () => 0.5),
  visualCues: [{ id: "front-seat", startMs: 0, endMs: 60_000, imageUrl: "/assets/podcasts/front-seat.jpg", alt: "Front seats and dashboard of the reviewed car", caption: "The view from both front seats.", perspective: "both" as const }],
  transcript: [{ id: "driver-intro", startMs: 0, endMs: 15_000, speaker: "driver" as const, text: "The steering response is the first thing the driver notices." }],
  chapters: [{ id: "first-impressions", startMs: 0, title: "First impressions" }],
};

test("episode contracts accept only bounded, timed and accessible media", () => {
  assert.equal(twoDudesEpisodeSchema.safeParse(validEpisode).success, true);
  assert.equal(twoDudesEpisodeSchema.safeParse({ ...validEpisode, audioUrl: "javascript:alert(1)" }).success, false);
  assert.equal(twoDudesEpisodeSchema.safeParse({ ...validEpisode, visualCues: [{ ...validEpisode.visualCues[0], endMs: 700_000 }] }).success, false);
  assert.equal(twoDudesEpisodeSchema.safeParse({ ...validEpisode, visualCues: [{ ...validEpisode.visualCues[0], alt: "car" }] }).success, false);
});

test("the synchronized experience resolves the active visual and transcript cue", () => {
  const parsed = twoDudesEpisodeSchema.parse(validEpisode);
  assert.equal(findEpisodeMoment(parsed.visualCues, 30_000)?.id, "front-seat");
  assert.equal(findEpisodeMoment(parsed.transcript, 8_000)?.id, "driver-intro");
  assert.equal(findEpisodeMoment(parsed.transcript, 90_000), null);
});

test("fallback waveforms are stable, bounded and series launch data stays honest", () => {
  const first = buildPodcastWaveform("episode-one", 64);
  assert.deepEqual(first, buildPodcastWaveform("episode-one", 64));
  assert.notDeepEqual(first, buildPodcastWaveform("episode-two", 64));
  assert.equal(first.length, 64);
  assert.ok(first.every((value) => value >= 0.08 && value <= 1));
  assert.equal(twoDudesInWheelsSeries.status, "in-production");
  assert.equal(twoDudesInWheelsSeries.episodes.length, 0);
});
