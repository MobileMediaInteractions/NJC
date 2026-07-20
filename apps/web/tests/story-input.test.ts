import assert from "node:assert/strict";
import test from "node:test";
import { firstStoryError, storyInput } from "../src/lib/story-input";

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
