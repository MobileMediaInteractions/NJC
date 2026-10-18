import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PgDialect } from "drizzle-orm/pg-core";
import { CommunityBulletinCard } from "../src/components/community-bulletin-card";
import { CommunityBulletinDetail } from "../src/components/community-bulletin-detail";
import { CommunityHomeSection } from "../src/components/community-home-section";
import { communityBulletinPath, isCommunitySlug, safeCommunityExternalUrl, type PublicCommunityBulletin } from "../src/lib/community-public-model";
import { publicCommunityCondition } from "../src/lib/public-community";

const bulletin: PublicCommunityBulletin = {
  id: "a59b6a00-0000-4000-8000-000000000001", slug: "neighbors-helping-neighbors",
  title: "Neighbors helping neighbors", category: "volunteer",
  description: "First paragraph from the community desk.\n\nThe complete second paragraph must remain visible.\nLearn more: https://example.org/volunteer",
  startsAt: new Date("2026-11-08T14:45:00Z"), endsAt: null,
  venue: "Community hall", city: "Edison", organizer: "Neighborhood volunteers",
  externalUrl: "https://example.org/volunteer", isFeatured: true,
  publishedAt: new Date("2026-10-18T04:00:00Z"), updatedAt: new Date("2026-10-18T04:00:00Z"),
};
const timezone = "America/New_York";

test("the whole bulletin card is one keyboard-native link to its own community page", () => {
  const html = renderToStaticMarkup(createElement(CommunityBulletinCard, { bulletin, timezone }));
  assert.match(html, /^<a /);
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.match(html, /href="\/community\/neighbors-helping-neighbors"/);
  assert.match(html, /Read the full bulletin/);
  assert.match(html, /Nov 8, 2026, 9:45 AM/);
  assert.match(html, /dark:bg-\[#1d2a22\]/);
});

test("homepage showcase contains real bulletins, exploration and community-specific submission paths", () => {
  const html = renderToStaticMarkup(createElement(CommunityHomeSection, { bulletins: [bulletin], timezone, available: true }));
  assert.match(html, /In the Community/);
  assert.match(html, /Neighbors helping neighbors/);
  assert.match(html, /href="\/community#submit-event"/);
  assert.doesNotMatch(html, /href="\/tips"/);
});

test("empty and unavailable bulletin states are honest rather than seeded content", () => {
  const empty = renderToStaticMarkup(createElement(CommunityHomeSection, { bulletins: [], timezone, available: true }));
  const unavailable = renderToStaticMarkup(createElement(CommunityHomeSection, { bulletins: [], timezone, available: false }));
  assert.match(empty, /after review/);
  assert.match(unavailable, /temporarily unavailable/);
  assert.doesNotMatch(empty + unavailable, /Neighbors helping neighbors/);
});

test("detail retains the complete body, organizer and event information without news-story actions", () => {
  const html = renderToStaticMarkup(createElement(CommunityBulletinDetail, { bulletin, timezone, now: new Date("2026-10-18T12:00:00Z") }));
  assert.match(html, /complete second paragraph must remain visible/);
  assert.match(html, /Neighborhood volunteers/);
  assert.match(html, /Community hall · Edison/);
  assert.match(html, /not a reported news article/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /line-clamp|listed date has passed|Save story/);
});

test("past events remain readable and clearly marked historical", () => {
  const html = renderToStaticMarkup(createElement(CommunityBulletinDetail, { bulletin, timezone, now: new Date("2026-11-09T12:00:00Z") }));
  assert.match(html, /listed date has passed/);
});

test("undated community updates do not invent a date, venue or organizer", () => {
  const html = renderToStaticMarkup(createElement(CommunityBulletinDetail, { bulletin: { ...bulletin, startsAt: null, venue: null, city: null, organizer: null, externalUrl: null }, timezone }));
  assert.match(html, /Around the neighborhood/);
  assert.doesNotMatch(html, /Plan your visit|Organizer details|<dt/);
});

test("bulletin text is escaped, never interpreted as HTML or executable links", () => {
  const html = renderToStaticMarkup(createElement(CommunityBulletinDetail, { bulletin: { ...bulletin, description: '<script>alert("x")</script>\n\njavascript:alert(1)', externalUrl: "javascript:alert(1)" }, timezone }));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script|href="javascript:/);
  for (const url of ["http://example.org", "javascript:alert(1)", "https://user:pass@example.org", "invalid"]) assert.equal(safeCommunityExternalUrl(url), null);
});

test("public queries require published status and a publication time that has arrived", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  const query = new PgDialect().sqlToQuery(publicCommunityCondition(now)!);
  assert.match(query.sql, /"status" = \$1/);
  assert.match(query.sql, /"published_at" <= \$2/);
  assert.equal(query.params[0], "published");
  assert.equal(query.params[1], now.toISOString());
});

test("slugs are bounded and cannot contain paths, traversal or URL syntax", () => {
  assert.equal(communityBulletinPath(bulletin.slug), "/community/neighbors-helping-neighbors");
  assert.equal(isCommunitySlug(bulletin.slug), true);
  for (const slug of ["../draft", "//example.org", "bad?status=draft", "", "a".repeat(181)]) assert.equal(isCommunitySlug(slug), false);
});
