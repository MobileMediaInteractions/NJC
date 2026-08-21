import assert from "node:assert/strict";
import test from "node:test";
import {
  firstStoryError,
  storyInput,
  storyTimestampInput,
} from "../src/lib/story-input";
import { createPlainStoryRichTextDocument } from "../src/lib/story-rich-text";

const validStory = {
  headline: "Council adopts a revised township budget",
  slug: "council-adopts-a-revised-township-budget",
  dek: "The revised plan changes municipal spending for the coming year.",
  body: ["The council approved the revised budget after a public hearing."],
  categorySlug: "middlesex" as const,
  categoryLabel: "Middlesex County",
  location: "New Brunswick",
  imageUrl: "",
  imageAlt: "",
  tags: ["local government"],
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  noIndex: false,
  isBreaking: false,
  status: "published" as const,
};

test("accepts a complete publish request with optional URLs left blank", () => {
  const result = storyInput.safeParse(validStory);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.includeWhyItMatters, false);
    assert.equal(result.data.includePublicNote, false);
    assert.equal(result.data.publicNoteType, "editors_note");
    assert.equal(result.data.bylineMode, "account");
  }
});

test("validates the three public story-note types and requires meaningful copy", () => {
  for (const publicNoteType of ["editors_note", "reporting_note", "update_note"] as const) {
    assert.equal(storyInput.safeParse({
      ...validStory,
      includePublicNote: true,
      publicNoteType,
      publicNote: "Readers need this verified editorial context.",
    }).success, true);
  }
  const incomplete = storyInput.safeParse({
    ...validStory,
    includePublicNote: true,
    publicNoteType: "editors_note",
    publicNote: "Short",
  });
  assert.equal(incomplete.success, false);
  if (!incomplete.success) assert.match(incomplete.error.flatten().fieldErrors.publicNote?.[0] ?? "", /at least 10/i);
  assert.equal(storyInput.safeParse({
    ...validStory,
    includePublicNote: false,
    publicNote: "",
  }).success, true);
});

test("accepts validated rich copy and rejects unsupported rich nodes", () => {
  const document = createPlainStoryRichTextDocument(validStory.body);
  assert.equal(storyInput.safeParse({ ...validStory, richBody: document }).success, true);

  document.state.root.children = [{ type: "embedded-script", version: 1 }];
  assert.equal(storyInput.safeParse({ ...validStory, richBody: document }).success, false);
});

test("accepts an inactive planned publication time while a story is still a draft", () => {
  const result = storyInput.safeParse({
    ...validStory,
    status: "draft",
    scheduledAt: "2025-06-15T16:30:00.000Z",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.status, "draft");
    assert.equal(result.data.scheduledAt, "2025-06-15T16:30:00.000Z");
  }
});

test("accepts only a server-resolved byline mode, not arbitrary author input", () => {
  assert.equal(
    storyInput.safeParse({ ...validStory, bylineMode: "pseudonym" }).success,
    true,
  );
  assert.equal(
    storyInput.safeParse({ ...validStory, bylineMode: "someone-else" }).success,
    false,
  );
});

test("requires accessible alt text when a lead image is present", () => {
  const result = storyInput.safeParse({ ...validStory, imageUrl: "https://example.com/photo.jpg", imageAlt: "" });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.flatten().fieldErrors.imageAlt?.[0] ?? "", /Describe/);
});

test("requires generated placeholders to remain connected to a media asset", () => {
  assert.equal(storyInput.safeParse({
    ...validStory,
    imageUrl: "https://example.com/generated.jpg",
    imageAlt: "AI-generated editorial illustration for the budget story.",
    imageKind: "ai_placeholder",
  }).success, false);
  assert.equal(storyInput.safeParse({
    ...validStory,
    imageUrl: "https://example.com/generated.jpg",
    imageAlt: "AI-generated editorial illustration for the budget story.",
    imageAssetId: "4ee0d75f-9d83-47a6-a040-d3d961a96d1c",
    imageKind: "ai_placeholder",
  }).success, true);
});

test("returns actionable errors for incomplete stories", () => {
  const result = storyInput.safeParse({ ...validStory, headline: "Short", dek: "Too short", body: [] });
  assert.equal(result.success, false);
  if (result.success) return;
  const errors = result.error.flatten().fieldErrors;
  assert.match(errors.headline?.[0] ?? "", /headline/i);
  assert.match(errors.dek?.[0] ?? "", /summary/i);
  assert.match(errors.body?.[0] ?? "", /paragraph/i);
  assert.equal(firstStoryError(errors), errors.headline?.[0]);
});

test("rejects malformed canonical URLs", () => {
  const result = storyInput.safeParse({ ...validStory, canonicalUrl: "njcourier.com/story" });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.flatten().fieldErrors.canonicalUrl?.[0] ?? "", /complete URL/i);
});

test("custom posted times require acknowledgement and an editorial reason", () => {
  const customTime = {
    ...validStory,
    publishedAt: "2025-06-15T16:30:00.000Z",
    publishedAtChangeReason: "Restoring the timestamp from the verified print archive.",
  };
  assert.equal(storyInput.safeParse(customTime).success, false);
  assert.equal(
    storyInput.safeParse({
      ...customTime,
      publishedAtRiskAcknowledged: true,
    }).success,
    true,
  );
});

test("timestamp overrides reject chronology errors", () => {
  const result = storyTimestampInput.safeParse({
    publishedAt: "2025-06-15T16:30:00.000Z",
    updatedAt: "2025-06-14T16:30:00.000Z",
    reason: "Correcting imported archival metadata after source verification.",
    acknowledgeReportingRisk: true,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(
      result.error.flatten().fieldErrors.updatedAt?.[0] ?? "",
      /earlier than the published time/i,
    );
  }
});
