import assert from "node:assert/strict";
import test from "node:test";
import {
  canPublishStory,
  canTransitionStoryStatus,
  isValidScheduledPublication,
} from "../src/lib/story-workflow";

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
  assert.equal(canTransitionStoryStatus("review", "published", "editor"), false);
  assert.equal(canTransitionStoryStatus("review", "scheduled", "editor"), false);
  assert.equal(canTransitionStoryStatus("review", "draft", "producer"), true);
  assert.equal(canTransitionStoryStatus("review", "published", "reporter"), false);
  assert.equal(canTransitionStoryStatus("review", "scheduled", "reporter"), false);
  assert.equal(canTransitionStoryStatus("scheduled", "review", "editor"), false);
  assert.equal(canTransitionStoryStatus("scheduled", "published", "producer"), false);
  assert.equal(canTransitionStoryStatus("scheduled", "draft", "admin"), false);
  assert.equal(canTransitionStoryStatus("published", "draft", "admin"), false);
  assert.equal(canTransitionStoryStatus("draft", "published", "admin"), false);
  assert.equal(canTransitionStoryStatus("draft", "scheduled", "admin"), false);
});

test("scheduled publication requires a real future time", () => {
  const now = new Date("2026-07-28T16:00:00.000Z");
  assert.equal(
    isValidScheduledPublication(
      new Date("2026-07-28T16:01:00.000Z"),
      now,
    ),
    true,
  );
  assert.equal(
    isValidScheduledPublication(
      new Date("2026-07-28T16:00:59.999Z"),
      now,
    ),
    false,
  );
  assert.equal(isValidScheduledPublication(new Date("invalid"), now), false);
});
