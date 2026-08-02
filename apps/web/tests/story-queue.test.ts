import assert from "node:assert/strict";
import test from "node:test";
import { countStoriesByQueueTab, storyMatchesQueueTab } from "../src/lib/story-queue";
const story = (status: "idea" | "assigned" | "draft" | "review" | "scheduled" | "published" | "archived", isActive = false) => ({ status, isActive });

test("groups early workflow statuses into drafts and review into submitted", () => {
  assert.equal(storyMatchesQueueTab(story("idea"), "drafts"), true);
  assert.equal(storyMatchesQueueTab(story("assigned"), "drafts"), true);
  assert.equal(storyMatchesQueueTab(story("draft"), "drafts"), true);
  assert.equal(storyMatchesQueueTab(story("review"), "submitted"), true);
  assert.equal(storyMatchesQueueTab(story("published"), "complete"), true);
  assert.equal(storyMatchesQueueTab(story("review"), "drafts"), false);
});

test("active work excludes final published stories and the archive", () => {
  const stories = [
    story("draft"),
    story("draft"),
    story("review"),
    story("scheduled"),
    story("published", true),
    story("published"),
    story("archived"),
  ];
  assert.deepEqual(countStoriesByQueueTab(stories), {
    active: 5,
    drafts: 2,
    submitted: 1,
    scheduled: 1,
    complete: 2,
    archived: 1,
  });
});
