import assert from "node:assert/strict";
import test from "node:test";
import { storyContentHash, storyPublicationBlockers } from "../src/lib/story-content-integrity";
import { canApproveStory, canScheduleApprovedStory, isDue, utcSchedulePreview } from "../src/lib/story-scheduling-policy";

const material = {
  headline: "Council adopts revised public budget",
  dek: "The vote followed three public hearings.",
  body: ["The council voted Tuesday after hearing from residents."],
  whyItMatters: null,
  publicNoteType: null,
  publicNote: null,
  categorySlug: "local",
  categoryLabel: "Local",
  location: "New Brunswick",
  imageUrl: null,
  imageAlt: null,
  videoUrl: null,
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  noIndex: false,
  publicBylineSnapshot: { mode: "account", name: "Jamie Rivera" },
};

test("approval is independent and restricted to publishing roles", () => {
  assert.equal(canApproveStory({ role: "editor", storyStatus: "review", viewerUserId: "editor", authorId: "author" }), true);
  assert.equal(canApproveStory({ role: "editor", storyStatus: "review", viewerUserId: "author", authorId: "author" }), false);
  assert.equal(canApproveStory({ role: "reporter", storyStatus: "review", viewerUserId: "reporter", authorId: "author" }), false);
});

test("scheduling requires an explicit approval", () => {
  assert.equal(canScheduleApprovedStory("producer", "review", true), true);
  assert.equal(canScheduleApprovedStory("producer", "review", false), false);
  assert.equal(canScheduleApprovedStory("producer", "draft", true), false);
});

test("content hashes are stable and material changes invalidate them", () => {
  const first = storyContentHash(material);
  assert.equal(first, storyContentHash({ ...material }));
  assert.notEqual(first, storyContentHash({ ...material, headline: "Changed headline" }));
  assert.notEqual(first, storyContentHash({
    ...material,
    publicNoteType: "editors_note",
    publicNote: "The editor added verified context about the reporting process.",
  }));
  assert.deepEqual(storyPublicationBlockers(material), []);
  assert.deepEqual(storyPublicationBlockers({ ...material, body: [] }), ["body_missing"]);
  assert.deepEqual(
    storyPublicationBlockers({ ...material, publicNoteType: "editors_note" }),
    ["public_note_incomplete"],
  );
  assert.deepEqual(
    storyPublicationBlockers({ ...material, imageKind: "ai_placeholder" }),
    ["lead_media_temporary_ai_placeholder"],
  );
  assert.notEqual(
    storyContentHash(material),
    storyContentHash({ ...material, imageKind: "ai_placeholder" }),
  );
});

test("the publication instant is never considered due early", () => {
  const instant = new Date("2026-11-01T06:30:00.000Z");
  assert.equal(isDue(instant, new Date("2026-11-01T06:29:59.999Z")), false);
  assert.equal(isDue(instant, instant), true);
  assert.equal(utcSchedulePreview(instant), "2026-11-01T06:30:00Z");
});
