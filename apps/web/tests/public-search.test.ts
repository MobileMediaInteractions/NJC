import assert from "node:assert/strict";
import test from "node:test";
import type { Story } from "@harborline/contracts";
import {
  buildPublicSearchSuggestionGroups,
  publicSearchPageQuerySchema,
  publicSearchLikePattern,
  publicSearchSuggestionCount,
  publicSearchSuggestionQuerySchema,
} from "../src/lib/public-search";

function story(overrides: Partial<Story> = {}): Story {
  return {
    id: "story-1",
    slug: "transit-plan",
    headline: "Middlesex transit plan moves forward",
    dek: "County officials approved the next planning phase.",
    body: ["Reporting."],
    category: "statehouse",
    categoryLabel: "Statehouse Desk",
    location: "New Brunswick",
    publishedAt: "2026-08-20T14:00:00.000Z",
    updatedAt: "2026-08-20T14:00:00.000Z",
    readingMinutes: 4,
    image: "/image.png",
    imageAlt: "Transit planning meeting",
    author: {
      id: "author-1",
      name: "Avery Rivera",
      role: "Statehouse reporter",
      initials: "AR",
      profileSlug: "avery-rivera",
    },
    tags: ["Public Transit", "County Government"],
    status: "published",
    noIndex: false,
    ...overrides,
  };
}

test("suggestion and full-search queries are trimmed and bounded", () => {
  assert.deepEqual(
    publicSearchSuggestionQuerySchema.parse({ q: "  transit  " }),
    { q: "transit", limit: 5 },
  );
  assert.equal(publicSearchSuggestionQuerySchema.safeParse({ q: "t" }).success, false);
  assert.equal(publicSearchSuggestionQuerySchema.safeParse({ q: "x".repeat(121) }).success, false);
  assert.equal(publicSearchSuggestionQuerySchema.safeParse({ q: "transit", limit: 9 }).success, false);
  assert.equal(publicSearchPageQuerySchema.parse("  t  "), "t");
  assert.equal(publicSearchLikePattern("100%_local\\news"), "%100\\%\\_local\\\\news%");
});

test("suggestions are grouped from real published story metadata", () => {
  const topic = buildPublicSearchSuggestionGroups([story()], "trans", 5);
  assert.equal(topic.topics[0]?.title, "Public Transit");
  assert.equal(topic.stories[0]?.title, "Middlesex transit plan moves forward");
  assert.equal(topic.people.length, 0);

  const person = buildPublicSearchSuggestionGroups([story()], "avery", 5);
  assert.deepEqual(person.people.map((item) => item.href), ["/author/avery-rivera"]);
  assert.equal(person.stories[0]?.title, "Middlesex transit plan moves forward");
  assert.equal(person.topics.length, 0);
});

test("draft and no-index stories cannot supply public suggestions", () => {
  const groups = buildPublicSearchSuggestionGroups([
    story({ id: "draft", status: "draft" }),
    story({ id: "hidden", noIndex: true }),
  ], "transit", 5);
  assert.deepEqual(groups, { topics: [], people: [], stories: [] });
  assert.equal(publicSearchSuggestionCount(groups), 0);
});

test("suggestion output is limited per group and contains only local links", () => {
  const stories = Array.from({ length: 12 }, (_, index) => story({
    id: `story-${index}`,
    slug: `transit-${index}`,
    headline: `Transit report ${index}`,
    category: `transit-${index}`,
    categoryLabel: `Transit ${index}`,
    tags: [`Transit topic ${index}`],
    author: {
      id: `author-${index}`,
      name: `Transit Reporter ${index}`,
      role: "Reporter",
      initials: `T${index}`,
      profileSlug: `transit-reporter-${index}`,
    },
  }));
  const groups = buildPublicSearchSuggestionGroups(stories, "transit", 3);

  assert.equal(groups.topics.length, 3);
  assert.equal(groups.people.length, 3);
  assert.equal(groups.stories.length, 3);
  for (const item of [...groups.topics, ...groups.people, ...groups.stories]) {
    assert.equal(item.href.startsWith("/"), true);
    assert.equal(item.href.startsWith("//"), false);
  }
});
