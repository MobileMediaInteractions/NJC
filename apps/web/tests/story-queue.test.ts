import assert from "node:assert/strict";
import test from "node:test";
import { countStoriesByQueueTab, storyMatchesQueueTab } from "../src/lib/story-queue";
import type { StoryStatus } from "../src/lib/types";

test("groups early workflow statuses into drafts and review into submitted", () => {
  assert.equal(storyMatchesQueueTab("idea", "drafts"), true);
  assert.equal(storyMatchesQueueTab("assigned", "drafts"), true);
  assert.equal(storyMatchesQueueTab("draft", "drafts"), true);
  assert.equal(storyMatchesQueueTab("review", "submitted"), true);
  assert.equal(storyMatchesQueueTab("published", "complete"), true);
  assert.equal(storyMatchesQueueTab("review", "drafts"), false);
});

test("counts every workflow without losing the complete all total", () => {
  const statuses: StoryStatus[] = ["draft", "draft", "review", "scheduled", "published", "archived"];
  assert.deepEqual(countStoriesByQueueTab(statuses), {
    all: 6,
    drafts: 2,
    submitted: 1,
    scheduled: 1,
    complete: 1,
    archived: 1,
  });
});
