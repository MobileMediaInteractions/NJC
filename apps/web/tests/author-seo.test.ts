import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthorProfileByName,
  getAuthorProfileBySlug,
  getAuthorProfilePaths,
} from "../src/lib/authors";
import { defaultSiteConfiguration } from "../src/lib/site-settings";
import { authorProfilePageJsonLd, storyPageJsonLd } from "../src/lib/seo";
import type { Story } from "../src/lib/types";

const story: Story = {
  id: "story-1",
  slug: "local-report",
  headline: "A local report",
  dek: "Verified local reporting.",
  body: ["Reporting body."],
  category: "middlesex",
  categoryLabel: "Middlesex County",
  location: "New Brunswick",
  publishedAt: "2026-07-22T12:00:00.000Z",
  updatedAt: "2026-07-22T13:00:00.000Z",
  readingMinutes: 1,
  image: "/assets/editorial/v1/garden-state-engraving.png",
  imageAlt: "New Jersey",
  author: {
    id: "author-1",
    name: "Abdullah Muzammil",
    role: "Contributor",
    initials: "AM",
  },
  tags: ["New Jersey"],
  status: "published",
};

test("Abdullah Muzammil has the only public author profile", () => {
  assert.equal(getAuthorProfileBySlug("abdullah-muzammil")?.name, "Abdullah Muzammil");
  assert.equal(getAuthorProfileByName("  ABDULLAH   MUZAMMIL ")?.slug, "abdullah-muzammil");
  assert.deepEqual(getAuthorProfilePaths(), ["/author/abdullah-muzammil"]);
  assert.equal(getAuthorProfileByName("Another Author"), undefined);
});

test("article markup links Abdullah to his unique profile page", () => {
  const json = JSON.stringify(
    storyPageJsonLd(story, defaultSiteConfiguration.publication),
  );
  assert.match(json, /"name":"Abdullah Muzammil"/);
  assert.match(json, /"url":"[^"]*\/author\/abdullah-muzammil"/);
  assert.match(json, /"@id":"[^"]*\/author\/abdullah-muzammil#person"/);
});

test("author profile markup connects Abdullah to attributed reporting", () => {
  const profile = getAuthorProfileBySlug("abdullah-muzammil");
  assert.ok(profile);
  const json = JSON.stringify(
    authorProfilePageJsonLd(
      profile,
      [story],
      defaultSiteConfiguration.publication,
    ),
  );
  assert.match(json, /"@type":"ProfilePage"/);
  assert.match(json, /"@type":"Person"/);
  assert.match(json, /"headline":"A local report"/);
});
