import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { StoryReviewActions } from "../src/components/studio/story-review-actions";

type Props = ComponentProps<typeof StoryReviewActions>;

function renderActions(overrides: Partial<Props> = {}) {
  const props: Props = {
    id: "story-1",
    slug: "council-budget",
    headline: "Council adopts revised public budget",
    bylineName: "Jamie Rivera",
    status: "review",
    scheduledAt: null,
    publicationTimezone: "America/New_York",
    canPublish: true,
    canApprove: true,
    canSubmitReview: true,
    isActive: false,
    activeStoryRevisionsEnabled: true,
    approval: null,
    publicationJob: null,
    ...overrides,
  };
  return renderToStaticMarkup(createElement(AppRouterContext.Provider, {
    value: { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} },
  }, createElement(StoryReviewActions, props)));
}

test("an outdated approval offers a fresh review instead of a false Approved badge or publication", () => {
  const html = renderActions({ approvalNeedsRenewal: true });
  assert.match(html, /Approve revision/);
  assert.match(html, /previous approval does not verify the current revision/);
  assert.doesNotMatch(html, /Publish now|>\s*Schedule<|Approved Oct/);
});

test("a matching approval exposes publication and scheduling", () => {
  const html = renderActions({ approval: { approvedAt: "2026-10-14T16:00:00Z", note: "Copy checked" } });
  assert.match(html, /Publish now/);
  assert.match(html, />\s*Schedule<\/button>/);
  assert.match(html, /Approved Oct/);
  assert.doesNotMatch(html, /Approve revision|previous approval does not verify/);
});

test("a scheduled story with an outdated approval can return to review but cannot publish", () => {
  const html = renderActions({ status: "scheduled", approvalNeedsRenewal: true });
  assert.match(html, /Cancel schedule/);
  assert.match(html, /Cancel the schedule to return to review/);
  assert.doesNotMatch(html, /Publish now|Reschedule/);
});
