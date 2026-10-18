import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { formatCommunityDate } from "../src/lib/community-date-format";
import { CommunityManager } from "../src/components/studio/community-manager";

test("community dates format equally before and after JSON serialization", () => {
  const instant = new Date("2026-11-08T14:45:00Z");
  const formatted = formatCommunityDate(instant, "America/New_York");
  assert.equal(formatCommunityDate(instant.toISOString(), "America/New_York"), formatted);
  assert.match(formatted, /Nov 8, 2026, 9:45 AM/);
  assert.equal(formatCommunityDate("not-a-date", "America/New_York"), "Date unavailable");
});

test("a saved dated bulletin returned by the JSON API does not crash the community manager", () => {
  const bulletin = {
    id: "a59b6a00-0000-4000-8000-000000000001", title: "Community event", slug: "community-event",
    category: "arts", description: "A verified community event for the neighborhood.",
    startsAt: new Date("2026-11-08T14:45:00Z"), endsAt: null,
    venue: "Community venue", city: "Edison", organizer: "Organizer", externalUrl: null,
    status: "draft", isFeatured: false, createdByClerkId: "publisher", updatedByClerkId: "publisher",
    publishedAt: null, createdAt: new Date("2026-10-18T04:00:00Z"), updatedAt: new Date("2026-10-18T04:00:00Z"),
  };
  const response = JSON.parse(JSON.stringify(bulletin)) as typeof bulletin;
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, {
    value: { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} },
  }, createElement(CommunityManager, { initialBulletins: [response], initialSubmissions: [], canPublish: true, timezone: "America/New_York" })));
  assert.match(html, /Nov 8, 2026, 9:45 AM/);
  assert.match(html, /Community event/);
});
