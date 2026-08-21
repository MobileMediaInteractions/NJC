import assert from "node:assert/strict";
import test from "node:test";
import type { Story } from "@harborline/contracts";
import {
  projectStoryForReader,
  readerCompatibilityProfile,
} from "../src/lib/reader-api-compatibility";

const story: Story = {
  id: "story-1",
  slug: "verified-council-story",
  headline: "Council approves the verified plan",
  dek: "The public vote followed two hearings.",
  body: ["First verified paragraph.", "Second verified paragraph."],
  whyItMatters: "The plan changes municipal services.",
  publicNoteType: "editors_note",
  publicNote: "This story includes records obtained after the public meeting.",
  category: "local",
  categoryLabel: "Local News",
  location: "New Brunswick",
  publishedAt: "2026-08-20T12:00:00.000Z",
  readingMinutes: 2,
  image: "/assets/editorial/v1/garden-state-engraving.png",
  imageAlt: "An engraved outline of New Jersey.",
  author: { id: "author-1", name: "Jamie Rivera", role: "Reporter", initials: "JR" },
  tags: ["council", "budget"],
  status: "published",
  isBreaking: true,
};

test("capability-aware clients retain structured story-note fields", () => {
  const request = new Request("https://njc-web.vercel.app/api/v1/stories", {
    headers: {
      "X-NJC-Client": "roku",
      "X-NJC-Capabilities": "structured-story-notes-v1",
    },
  });
  assert.equal(readerCompatibilityProfile(request), "current");
  assert.equal(projectStoryForReader(story, request), story);
});

test("older official clients receive the note as the final body paragraph", () => {
  const request = new Request("https://njc-web.vercel.app/api/v1/stories", {
    headers: { "X-NJC-Client": "mobile" },
  });
  const projected = projectStoryForReader(story, request);
  assert.equal(readerCompatibilityProfile(request), "legacy_story_body");
  assert.equal(projected.body.at(-1), "EDITOR’S NOTE\nThis story includes records obtained after the public meeting.");
  assert.equal(projected.publicNote, undefined);
  assert.equal(projected.publicNoteType, undefined);
});

test("the immutable Roku 1.0.0 contract receives every representable field in body zero", () => {
  const request = new Request("https://njc-web.vercel.app/api/v1/stories", {
    headers: { "User-Agent": "Harborline-Roku/1.0.0" },
  });
  const projected = projectStoryForReader(story, request);
  assert.equal(readerCompatibilityProfile(request), "roku_1_0_0");
  assert.equal(projected.body.length, 1);
  assert.match(projected.body[0]!, /^BY JAMIE RIVERA/);
  assert.match(projected.body[0]!, /First verified paragraph[\s\S]*Second verified paragraph/);
  assert.match(projected.body[0]!, /WHY IT MATTERS[\s\S]*TOPICS/);
  assert.match(projected.body[0]!, /EDITOR’S NOTE\nThis story includes records obtained after the public meeting\.$/);
  assert.equal(projected.categoryLabel, "BREAKING · Local News");
  assert.equal(projected.image, "https://njc-web.vercel.app/assets/editorial/v1/garden-state-engraving.png");
});
