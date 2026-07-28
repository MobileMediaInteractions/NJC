import assert from "node:assert/strict";
import test from "node:test";
import {
  legacyPublicBylineSnapshot,
  normalizePseudonym,
  pseudonymConflictsWithNames,
  pseudonymSchema,
  publicStoryAuthor,
} from "../src/lib/pseudonyms";

test("pseudonyms normalize whitespace and compatibility characters", () => {
  assert.equal(normalizePseudonym("  Ｊａｎｅ   River  "), "jane river");
});

test("pseudonyms reject publication impersonation, markup and contact information", () => {
  for (const value of [
    "The New Jersey Courier",
    "<strong>Reporter</strong>",
    "https://example.com/name",
    "writer@example.com",
  ]) {
    assert.equal(pseudonymSchema.safeParse(value).success, false, value);
  }
});

test("pseudonym conflicts use canonical, case-insensitive names", () => {
  assert.equal(
    pseudonymConflictsWithNames("  Jamie Rivera ", ["JAMIE   RIVERA"]),
    true,
  );
});

test("public authors never contain an internal Clerk identifier", () => {
  const internal = {
    id: "user_clerk_secret",
    name: "Legal Account Name",
    role: "reporter",
    initials: "LA",
  };
  const legacy = legacyPublicBylineSnapshot({ authorSnapshot: internal });
  const author = publicStoryAuthor("story-1", legacy);
  assert.equal(author.name, "Legal Account Name");
  assert.equal(author.id, "story-story-1-byline");
  assert.doesNotMatch(JSON.stringify(author), /user_clerk_secret/);

  const pseudonym = publicStoryAuthor("story-2", {
    mode: "pseudonym",
    name: "Garden Observer",
    initials: "GO",
    role: "Courier contributor",
    pseudonymRevision: 4,
  });
  assert.equal(pseudonym.name, "Garden Observer");
  assert.equal(pseudonym.profileSlug, undefined);
  assert.doesNotMatch(JSON.stringify(pseudonym), /Legal Account Name|user_/);
});
