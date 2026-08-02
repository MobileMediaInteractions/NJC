import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStoryImagePrompt,
  cloudflareImageFromResponse,
  generatedStoryImageAlt,
  storyImageDigest,
} from "../src/lib/ai-story-image";

const context = {
  headline: "Council approves a new municipal library plan",
  dek: "The public project would replace the aging downtown branch.",
  body: [
    "Council members approved the plan after residents discussed access and construction costs.",
    "The proposed site is near the municipal complex in New Brunswick.",
  ],
  location: "New Brunswick",
  categoryLabel: "Middlesex County",
};

test("builds a bounded story-aware prompt with newsroom safety instructions", () => {
  const prompt = buildStoryImagePrompt(context);
  assert.match(prompt, /municipal library plan/i);
  assert.match(prompt, /New Brunswick/);
  assert.match(prompt, /Do not recreate the face or likeness/i);
  assert.match(prompt, /temporary AI-generated editorial illustration/i);
  assert.ok(prompt.length <= 2048);
});

test("story image digests are stable and change with editorial context", () => {
  assert.equal(storyImageDigest(context), storyImageDigest({ ...context }));
  assert.notEqual(
    storyImageDigest(context),
    storyImageDigest({ ...context, headline: "A different verified story" }),
  );
});

test("generated alt text discloses synthetic editorial imagery", () => {
  const alt = generatedStoryImageAlt(context.headline);
  assert.match(alt, /^AI-generated editorial illustration/);
  assert.ok(alt.length <= 240);
});

test("extracts only valid Cloudflare image payloads", () => {
  assert.equal(cloudflareImageFromResponse({ result: { image: "abc123" } }), "abc123");
  assert.equal(cloudflareImageFromResponse({ result: { response: "no image" } }), null);
  assert.equal(cloudflareImageFromResponse(null), null);
});
