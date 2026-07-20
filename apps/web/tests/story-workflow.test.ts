import assert from "node:assert/strict";
import test from "node:test";
import { canPublishStory, canTransitionStoryStatus } from "../src/lib/story-workflow";

test("only established publishing roles can publish", () => {
  assert.equal(canPublishStory("admin"), true);
  assert.equal(canPublishStory("editor"), true);
  assert.equal(canPublishStory("producer"), true);
  assert.equal(canPublishStory("reporter"), false);
  assert.equal(canPublishStory("contributor"), false);
});

test("review transitions follow the newsroom workflow", () => {
  assert.equal(canTransitionStoryStatus("draft", "review", "reporter", true), true);
  assert.equal(canTransitionStoryStatus("draft", "review", "reporter", false), false);
  assert.equal(canTransitionStoryStatus("draft", "review", "editor", false), true);
  assert.equal(canTransitionStoryStatus("review", "published", "editor"), true);
  assert.equal(canTransitionStoryStatus("review", "draft", "producer"), true);
  assert.equal(canTransitionStoryStatus("review", "published", "reporter"), false);
  assert.equal(canTransitionStoryStatus("published", "draft", "admin"), false);
  assert.equal(canTransitionStoryStatus("draft", "published", "admin"), false);
});
