import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublishedStoryOverrideBlocker,
  publishedStoryOverrideInput,
} from "../src/lib/published-story-override";

const validOverride = {
  action: "reopen_editing" as const,
  purpose: "correction" as const,
  reason: "A verified factual statement requires a documented correction.",
  confirmation: "REOPEN STORY" as const,
};

test("published-story override requires a classified, meaningful and explicit request", () => {
  assert.equal(publishedStoryOverrideInput.safeParse(validOverride).success, true);
  assert.equal(publishedStoryOverrideInput.safeParse({
    ...validOverride,
    reason: "Too short",
  }).success, false);
  assert.equal(publishedStoryOverrideInput.safeParse({
    ...validOverride,
    purpose: "make_it_better",
  }).success, false);
  assert.equal(publishedStoryOverrideInput.safeParse({
    ...validOverride,
    confirmation: "reopen story",
  }).success, false);
});

test("only a publishing role can reopen a final published story when revisions are enabled", () => {
  assert.equal(getPublishedStoryOverrideBlocker({
    role: "editor",
    status: "published",
    isActive: false,
    featureEnabled: true,
    hasPendingRevision: false,
  }), null);
  assert.equal(getPublishedStoryOverrideBlocker({
    role: "reporter",
    status: "published",
    isActive: false,
    featureEnabled: true,
    hasPendingRevision: false,
  }), "forbidden");
  assert.equal(getPublishedStoryOverrideBlocker({
    role: "admin",
    status: "review",
    isActive: false,
    featureEnabled: true,
    hasPendingRevision: false,
  }), "not_published");
  assert.equal(getPublishedStoryOverrideBlocker({
    role: "producer",
    status: "published",
    isActive: true,
    featureEnabled: true,
    hasPendingRevision: false,
  }), "already_active");
  assert.equal(getPublishedStoryOverrideBlocker({
    role: "admin",
    status: "published",
    isActive: false,
    featureEnabled: false,
    hasPendingRevision: false,
  }), "feature_disabled");
});
