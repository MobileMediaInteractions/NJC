import assert from "node:assert/strict";
import test from "node:test";
import { storyApprovalMatches, storyContentHash, storyPublicationBlockers } from "../src/lib/story-content-integrity";
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

test("saving an approval does not change the approved database row's content hash", () => {
  const row = {
    ...material,
    id: "story-1",
    slug: "council-budget",
    contentVersion: 3,
    contentHash: null as string | null,
    status: "review",
    createdAt: new Date("2026-10-12T05:00:00Z"),
    updatedAt: new Date("2026-10-12T05:30:00Z"),
    scheduledAt: null as Date | null,
    publishedAt: null as Date | null,
    isActive: false,
  };
  const approvedHash = storyContentHash(row);
  const saved = { ...row, contentHash: approvedHash, updatedAt: new Date("2026-10-12T06:02:00Z") };
  assert.equal(storyContentHash(saved), approvedHash);
  const scheduled = {
    ...saved,
    status: "scheduled",
    scheduledAt: new Date("2026-10-14T15:00:00Z"),
    isActive: true,
  };
  assert.equal(storyContentHash(scheduled), approvedHash);
  const published = {
    ...saved,
    status: "published",
    publishedAt: new Date("2026-10-14T15:00:00Z"),
  };
  assert.equal(storyContentHash(published), approvedHash);
});

test("review, immediate publication and scheduled publication agree on exact approval validity", () => {
  const story = { ...material, id: "story-1", contentVersion: 3 };
  const approval = {
    storyId: story.id,
    contentVersion: story.contentVersion,
    contentHash: storyContentHash(story),
    invalidatedAt: null as Date | null,
  };
  const saved = { ...story, contentHash: approval.contentHash, updatedAt: new Date() };
  assert.equal(storyApprovalMatches(saved, approval), true);
  const scheduled = { ...saved, status: "scheduled" };
  assert.equal(storyApprovalMatches(scheduled, approval), true);
  assert.equal(storyApprovalMatches({ ...saved, contentVersion: 4 }, approval), false);
  assert.equal(storyApprovalMatches({ ...saved, body: ["Unapproved replacement copy."] }, approval), false);
  assert.equal(storyApprovalMatches(saved, { ...approval, storyId: "another-story" }), false);
  assert.equal(storyApprovalMatches(saved, { ...approval, invalidatedAt: new Date() }), false);
  assert.equal(storyApprovalMatches(saved, { ...approval, contentHash: "old-full-row-hash" }), false);
  assert.equal(storyApprovalMatches(saved, null), false);
});

test("every reviewed content field stays protected while object key ordering is irrelevant", () => {
  const story = {
    ...material,
    slug: "council-budget",
    tags: ["budget"],
    imageKind: "editorial",
    imageAssetId: "asset-1",
    imageGeneration: null,
    publicBylinesSnapshot: [{ name: "Jamie Rivera", mode: "account" }],
    richBody: { type: "document", children: [{ text: "Reviewed copy", bold: false }] },
    isBreaking: false,
    isLive: false,
    isExclusive: false,
    isDeveloping: false,
  };
  const hash = storyContentHash(story);
  const changes = {
    slug: "another-url", headline: "Another headline", dek: "Another summary",
    body: ["Another paragraph"], richBody: { type: "document", children: [] },
    whyItMatters: "Another explanation", publicNoteType: "update_note", publicNote: "A new note",
    categorySlug: "politics", categoryLabel: "Politics", location: "Edison",
    imageUrl: "/another.jpg", imageAlt: "Another caption", imageAssetId: "asset-2",
    imageKind: "ai_placeholder", imageGeneration: { seed: 2 }, videoUrl: "/another.mp4",
    seoTitle: "Another SEO title", seoDescription: "Another search description",
    canonicalUrl: "https://example.com/another", noIndex: true,
    publicBylineSnapshot: { name: "Another author", mode: "account" },
    publicBylinesSnapshot: [{ name: "A second author", mode: "account" }],
    tags: ["education"], isBreaking: true, isLive: true, isExclusive: true, isDeveloping: true,
  };
  for (const [field, value] of Object.entries(changes)) {
    assert.notEqual(storyContentHash({ ...story, [field]: value }), hash, `${field} must invalidate approval`);
  }
  assert.equal(storyContentHash({
    ...story,
    publicBylinesSnapshot: [{ mode: "account", name: "Jamie Rivera" }],
    richBody: { children: [{ bold: false, text: "Reviewed copy" }], type: "document" },
  }), hash);
});

test("the publication instant is never considered due early", () => {
  const instant = new Date("2026-11-01T06:30:00.000Z");
  assert.equal(isDue(instant, new Date("2026-11-01T06:29:59.999Z")), false);
  assert.equal(isDue(instant, instant), true);
  assert.equal(utcSchedulePreview(instant), "2026-11-01T06:30:00Z");
});
