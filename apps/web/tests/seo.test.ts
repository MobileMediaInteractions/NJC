import assert from "node:assert/strict";
import test from "node:test";
import { homePageJsonLd, storyPageJsonLd } from "../src/lib/seo";
import { defaultSiteConfiguration } from "../src/lib/site-settings";
import type { Story } from "../src/lib/types";

const testStory: Story = {
  id: "test-story",
  slug: "test-story",
  headline: "Test story headline",
  dek: "A test-only description.",
  body: ["Test-only article body used to verify structured data."],
  category: "local",
  categoryLabel: "Local",
  location: "New Brunswick",
  publishedAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
  readingMinutes: 1,
  image: "/assets/editorial/v1/garden-state-engraving.png",
  imageAlt: "Test illustration",
  author: { id: "test-author", name: "Test Author", role: "Reporter", initials: "TA" },
  tags: ["test"],
  status: "published",
};

test("homepage identifies the publication and website", () => {
  const data = homePageJsonLd(defaultSiteConfiguration.publication);
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  const publisher = graph.find((item) => item["@type"] === "NewsMediaOrganization");
  const website = graph.find((item) => item["@type"] === "WebSite");
  assert.ok(publisher);
  assert.ok(website);
  assert.match(String(publisher["publishingPrinciples"]), /\/standards$/);
});

test("story structured data includes news and breadcrumb entities", () => {
  const data = storyPageJsonLd(testStory, defaultSiteConfiguration.publication);
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  const article = graph.find((item) => item["@type"] === "NewsArticle");
  const breadcrumbs = graph.find((item) => item["@type"] === "BreadcrumbList");
  assert.ok(article);
  assert.ok(breadcrumbs);
  const author = article["author"] as { name: string };
  const items = breadcrumbs["itemListElement"] as unknown[];

  assert.equal(article["@type"], "NewsArticle");
  assert.equal(article["headline"], testStory.headline);
  assert.equal(article["datePublished"], testStory.publishedAt);
  assert.equal(author.name, testStory.author.name);
  assert.ok(Number(article["wordCount"]) > 0);
  assert.equal(breadcrumbs["@type"], "BreadcrumbList");
  assert.equal(items.length, 3);
});
