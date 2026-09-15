import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildPodcastWaveform,
  courierMotionDeck,
  findEpisodeMoment,
  twoDudesEpisodeSchema,
  twoDudesInWheelsSeries,
} from "../src/lib/two-dudes-in-wheels";
import { buildMotionDeckFrame } from "../src/lib/two-dudes-motion-deck";
import {
  NJMOTION_MAGIC,
  NjMotionError,
  compileNjMotion,
  parseNjMotion,
} from "../src/lib/njmotion";

const demoDocumentPath = fileURLToPath(new URL(
  "../../cdn/public/assets/podcasts/two-dudes-in-wheels/demo/motiondeck-demo.njmotion",
  import.meta.url,
));
const demoSource = readFileSync(demoDocumentPath, "utf8");
const demoAssetRoot = fileURLToPath(new URL("../../cdn/public/assets", import.meta.url));

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
  animationCues: [{ id: "cabin-opening", startMs: 0, endMs: 60_000, scene: "cockpit" as const, perspective: "driver" as const, motion: "drive" as const, transition: "dashboard" as const, title: "First impressions", eyebrow: "Driver view", callouts: [{ label: "Focus", value: "Controls and visibility" }] }],
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

test("Courier MotionDeck resolves a bounded scene frame from the audio clock", () => {
  const episode = twoDudesEpisodeSchema.parse(validEpisode);
  const frame = buildMotionDeckFrame(episode, 30_000);
  assert.equal(frame.cue.id, "cabin-opening");
  assert.equal(frame.cueProgress, 0.5);
  assert.equal(frame.visual?.id, "front-seat");
  assert.equal(frame.episodeProgress, 0.05);
  assert.equal(courierMotionDeck.version, 1);
});

test("Courier MotionDeck falls back to the current speaker without inventing telemetry", () => {
  const episode = twoDudesEpisodeSchema.parse({ ...validEpisode, animationCues: [] });
  const frame = buildMotionDeckFrame(episode, 8_000);
  assert.equal(frame.cue.id, "motion-deck-fallback");
  assert.equal(frame.cue.perspective, "driver");
  assert.deepEqual(frame.cue.callouts, []);
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

test("the checked-in NJMotion fixture validates and compiles every timed track", () => {
  const document = parseNjMotion(demoSource);
  const episode = compileNjMotion(document);
  assert.equal(document.timebase, 1_000);
  assert.equal(episode.durationMs, 36_000);
  assert.equal(episode.visualCues.length, 3);
  assert.equal(episode.animationCues.length, 3);
  assert.equal(episode.transcript.length, 3);
  assert.equal(episode.chapters.length, 3);
  assert.equal(episode.visualCues[1]?.placement, "left-panel");
  assert.equal(episode.visualCues[2]?.entrance, "reveal");
  assert.match(episode.audioUrl, /demo-audio\.mp3$/);
  for (const asset of document.assets) {
    assert.ok(asset.checksumSha256, `${asset.id} should be reproducible`);
    const bytes = readFileSync(resolve(demoAssetRoot, asset.src.slice(1)));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.checksumSha256);
  }
});

test("NJMotion rejects unmarked, malformed and path-traversing documents", () => {
  assert.throws(() => parseNjMotion(demoSource.replace(NJMOTION_MAGIC, "JSON/1")), NjMotionError);
  assert.throws(() => parseNjMotion(`${NJMOTION_MAGIC}\n{broken`), NjMotionError);
  assert.throws(
    () => parseNjMotion(demoSource.replace(
      "/podcasts/two-dudes-in-wheels/demo/v1/exterior.svg",
      "/podcasts/../../private.svg",
    )),
    NjMotionError,
  );
});

test("NJMotion never compiles unknown, mistyped or overlong asset references", () => {
  assert.throws(
    () => parseNjMotion(demoSource.replace('"assetId": "exterior"', '"assetId": "private-master"')),
    NjMotionError,
  );
  assert.throws(
    () => parseNjMotion(demoSource.replace('"kind": "image", "src": "/podcasts/two-dudes-in-wheels/demo/v1/exterior.svg", "mimeType": "image/svg+xml"', '"kind": "audio", "src": "/podcasts/two-dudes-in-wheels/demo/v1/exterior.svg", "mimeType": "image/svg+xml"')),
    NjMotionError,
  );
  assert.throws(
    () => parseNjMotion(demoSource.replace('"end": 36000, "assetId": "passenger-cabin"', '"end": 46000, "assetId": "passenger-cabin"')),
    NjMotionError,
  );
});
