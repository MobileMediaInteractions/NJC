import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLinkInBioStoryDestination,
  isLinkInBioEntryLive,
  linkInBioEntryInput,
  normalizeSocialSource,
} from "../src/lib/link-in-bio";

test("social source attribution is allowlisted", () => {
  assert.equal(normalizeSocialSource("instagram"), "instagram");
  assert.equal(normalizeSocialSource("x"), "x");
  assert.equal(normalizeSocialSource("attacker.example"), "link_in_bio");
  assert.equal(normalizeSocialSource(undefined), "link_in_bio");
});

test("article destinations stay on the canonical publication", () => {
  const destination = buildLinkInBioStoryDestination(
    "school-board-adopts-budget",
    "threads",
  );
  assert.equal(destination.origin, "https://www.thejerseycourier.com");
  assert.equal(destination.pathname, "/story/school-board-adopts-budget");
  assert.equal(destination.searchParams.get("utm_source"), "threads");
  assert.equal(destination.searchParams.get("utm_medium"), "social");
  assert.equal(destination.searchParams.get("utm_campaign"), "link_in_bio");
});

test("availability windows fail closed", () => {
  const now = new Date("2026-08-11T18:00:00Z");
  assert.equal(isLinkInBioEntryLive({ isVisible: true, startsAt: null, endsAt: null }, now), true);
  assert.equal(isLinkInBioEntryLive({ isVisible: false, startsAt: null, endsAt: null }, now), false);
  assert.equal(isLinkInBioEntryLive({ isVisible: true, startsAt: new Date("2026-08-12T00:00:00Z"), endsAt: null }, now), false);
  assert.equal(isLinkInBioEntryLive({ isVisible: true, startsAt: null, endsAt: new Date("2026-08-11T17:00:00Z") }, now), false);
});

test("invalid availability windows are rejected before persistence", () => {
  assert.equal(linkInBioEntryInput.safeParse({
    storyId: "ad4a2f8e-c29a-40ef-82a2-c98c0fd55031",
    startsAt: "2026-08-12T12:00:00.000Z",
    endsAt: "2026-08-12T11:00:00.000Z",
  }).success, false);
});
