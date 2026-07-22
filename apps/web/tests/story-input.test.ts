import assert from "node:assert/strict";
import test from "node:test";
import {
  firstStoryError,
  storyInput,
  storyTimestampInput,
} from "../src/lib/story-input";

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
  assert.equal(storyInput.safeParse(validStory).success, true);
});

test("requires accessible alt text when a lead image is present", () => {
  const result = storyInput.safeParse({ ...validStory, imageUrl: "https://example.com/photo.jpg", imageAlt: "" });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.flatten().fieldErrors.imageAlt?.[0] ?? "", /Describe/);
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
