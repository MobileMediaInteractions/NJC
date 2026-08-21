import assert from "node:assert/strict";
import test from "node:test";
import {
  canPublishLiveCoverage,
  canWriteLiveCoverage,
  liveEventCreateInput,
  liveEventUpdateInput,
  liveSlug,
  liveTimelineUpdateInput,
  nextLiveEventStatus,
  normalizeLiveEvent,
  normalizeLiveUpdate,
} from "../src/lib/live-coverage";
import { mergeLiveCoverageSnapshot } from "../src/lib/live-coverage-client";
import type { LiveCoverageDetail, LiveCoverageUpdate } from "@harborline/contracts";

test("live desk slugs are stable, bounded, and URL safe", () => {
  assert.equal(liveSlug("  Trenton’s 2026 Budget — LIVE  "), "trentons-2026-budget-live");
  assert.match(liveSlug("***"), /^live-\d+$/);
  assert.ok(liveSlug("x".repeat(400)).length <= 90);
});

test("live desk input requires a useful public explanation", () => {
  assert.equal(liveEventCreateInput.safeParse({ title: "Too short", description: "thin" }).success, false);
  assert.equal(liveEventCreateInput.safeParse({
    title: "Middlesex County election results",
    description: "Verified returns, reactions and context from the Courier newsroom.",
    location: "Middlesex County, NJ",
  }).success, true);
});

test("live media and stream destinations must use complete HTTPS URLs", () => {
  assert.equal(liveEventUpdateInput.safeParse({ streamUrl: "http://example.com/live.m3u8" }).success, false);
  assert.equal(liveEventUpdateInput.safeParse({ streamUrl: "javascript:alert(1)" }).success, false);
  assert.equal(liveEventUpdateInput.safeParse({ streamUrl: "https://video.example.com/live.m3u8" }).success, true);
  assert.equal(liveTimelineUpdateInput.safeParse({
    kind: "media",
    body: "A verified image from the scene.",
    mediaUrl: "file:///etc/passwd",
  }).success, false);
});

test("live desk lifecycle rejects skipped and reversed states", () => {
  assert.equal(nextLiveEventStatus("draft", "start"), "live");
  assert.equal(nextLiveEventStatus("draft", "end"), null);
  assert.equal(nextLiveEventStatus("scheduled", "start"), "live");
  assert.equal(nextLiveEventStatus("live", "pause"), "paused");
  assert.equal(nextLiveEventStatus("paused", "resume"), "live");
  assert.equal(nextLiveEventStatus("live", "end"), "ended");
  assert.equal(nextLiveEventStatus("ended", "archive"), "archived");
  assert.equal(nextLiveEventStatus("archived", "start"), null);
});

test("reporters can draft but only publishing roles can change public state", () => {
  assert.equal(canWriteLiveCoverage("reporter"), true);
  assert.equal(canPublishLiveCoverage("reporter"), false);
  assert.equal(canPublishLiveCoverage("producer"), true);
  assert.equal(canPublishLiveCoverage("editor"), true);
  assert.equal(canPublishLiveCoverage("admin"), true);
  assert.equal(canWriteLiveCoverage("contributor"), false);
});

test("public live normalization keeps internal Clerk IDs out of the contract", () => {
  const now = new Date("2026-08-21T12:00:00.000Z");
  const event = normalizeLiveEvent({
    id: "event-id",
    slug: "election-live",
    title: "Election live",
    description: "Verified election coverage from the newsroom.",
    status: "live",
    location: "Middlesex County",
    streamUrl: null,
    heroImageUrl: null,
    heroImageAlt: null,
    relatedStoryId: null,
    isFeatured: true,
    isLive: true,
    scheduledAt: null,
    startedAt: now,
    endedAt: null,
    createdByClerkId: "private_creator",
    updatedByClerkId: "private_editor",
    createdAt: now,
    updatedAt: now,
  }, 2, now);
  assert.equal(event.status, "live");
  assert.equal(event.updateCount, 2);
  assert.equal("createdByClerkId" in event, false);

  const update = normalizeLiveUpdate({
    id: "update-id",
    eventId: "event-id",
    kind: "breaking",
    status: "published",
    headline: "Polls close",
    body: "Polls have closed across the county.",
    mediaUrl: null,
    mediaAlt: null,
    sourceUrl: null,
    sourceLabel: null,
    authorSnapshot: { clerkId: "private_reporter", name: "Courier Reporter", role: "reporter", initials: "CR" },
    isPinned: false,
    revision: 1,
    publishedAt: now,
    correctedAt: null,
    retractedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  assert.deepEqual(update.author, { name: "Courier Reporter", role: "reporter", initials: "CR" });
  assert.equal("clerkId" in update.author, false);
});

test("incremental live snapshots remove retracted updates and keep canonical counts", () => {
  const publishedAt = "2026-08-21T12:00:00.000Z";
  const update = (id: string, headline: string): LiveCoverageUpdate => ({
    id,
    kind: "update",
    headline,
    body: `${headline} body`,
    mediaUrl: null,
    mediaAlt: null,
    sourceUrl: null,
    sourceLabel: null,
    author: { name: "Courier Reporter", role: "reporter", initials: "CR" },
    isPinned: false,
    revision: 1,
    publishedAt,
    correctedAt: null,
  });
  const base: LiveCoverageDetail = {
    id: "event-id",
    slug: "election-live",
    title: "Election live",
    description: "Verified election coverage from the newsroom.",
    status: "live",
    location: "Middlesex County",
    streamUrl: null,
    heroImageUrl: null,
    heroImageAlt: null,
    relatedStoryId: null,
    isFeatured: true,
    scheduledAt: null,
    startedAt: publishedAt,
    endedAt: null,
    updatedAt: publishedAt,
    updateCount: 2,
    latestUpdateAt: publishedAt,
    updates: [update("keep", "Original"), update("remove", "Withdrawn")],
    removedUpdateIds: [],
  };
  const merged = mergeLiveCoverageSnapshot(base, {
    ...base,
    updatedAt: "2026-08-21T12:01:00.000Z",
    updateCount: 1,
    updates: [{ ...update("keep", "Corrected"), revision: 2 }],
    removedUpdateIds: ["remove"],
  });

  assert.equal(merged.updateCount, 1);
  assert.deepEqual(merged.updates.map((item) => item.id), ["keep"]);
  assert.equal(merged.updates[0]?.headline, "Corrected");
  assert.deepEqual(merged.removedUpdateIds, []);
});
