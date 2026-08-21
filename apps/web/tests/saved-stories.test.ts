import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_LOCAL_SAVED_STORIES,
  normalizeSavedStoryPath,
  parseSavedStorySummary,
  readSavedStoryPaths,
  SAVED_STORIES_STORAGE_KEY,
  savedStorySlug,
  writeSavedStoryPaths,
} from "../src/lib/saved-stories";

test("saved story paths accept only same-origin canonical story slugs", () => {
  const origin = "https://www.thejerseycourier.com";
  assert.equal(normalizeSavedStoryPath("/story/council-vote", origin), "/story/council-vote");
  assert.equal(normalizeSavedStoryPath(`${origin}/story/council-vote?share=1`, origin), "/story/council-vote");
  assert.equal(normalizeSavedStoryPath("https://evil.example/story/council-vote", origin), null);
  assert.equal(normalizeSavedStoryPath("/story/../studio", origin), null);
  assert.equal(normalizeSavedStoryPath("/story/UPPERCASE", origin), null);
});

test("saved story storage deduplicates, rejects malformed entries and remains bounded", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const origin = "https://www.thejerseycourier.com";
  const inputs = Array.from({ length: MAX_LOCAL_SAVED_STORIES + 4 }, (_, index) => `/story/report-${index}`);
  const written = writeSavedStoryPaths(storage, ["javascript:alert(1)", ...inputs, inputs.at(-1)!], origin);

  assert.equal(written.length, MAX_LOCAL_SAVED_STORIES);
  assert.deepEqual(readSavedStoryPaths(storage, origin), written);
  assert.equal(savedStorySlug(written[0]!), "report-4");

  values.set(SAVED_STORIES_STORAGE_KEY, "not-json");
  assert.deepEqual(readSavedStoryPaths(storage, origin), []);
});

test("saved story API records are checked before rendering", () => {
  const story = {
    id: "story-1",
    slug: "council-vote",
    headline: "Council approves the Route 9 plan",
    dek: "The approved plan enters its next public phase.",
    categoryLabel: "Middlesex County",
    image: "/assets/editorial/v1/garden-state-engraving.png",
    imageAlt: "An outline map of New Jersey",
    publishedAt: "2026-08-21T12:00:00.000Z",
    readingMinutes: 4,
  };
  assert.deepEqual(parseSavedStorySummary(story), story);
  assert.equal(parseSavedStorySummary({ ...story, slug: "../../studio" }), null);
  assert.equal(parseSavedStorySummary({ ...story, readingMinutes: "four" }), null);
});
