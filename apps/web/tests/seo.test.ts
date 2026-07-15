import assert from "node:assert/strict";
import test from "node:test";
import { seedStories } from "../src/lib/seed";
import { homePageJsonLd, storyPageJsonLd } from "../src/lib/seo";

test("homepage identifies the publication and website", () => {
  const data = homePageJsonLd();
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  const publisher = graph.find((item) => item["@type"] === "NewsMediaOrganization");
  const website = graph.find((item) => item["@type"] === "WebSite");
  assert.ok(publisher);
  assert.ok(website);
  assert.match(String(publisher["publishingPrinciples"]), /\/standards$/);
});

test("story structured data includes news and breadcrumb entities", () => {
  const data = storyPageJsonLd(seedStories[0]);
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  const article = graph.find((item) => item["@type"] === "NewsArticle");
  const breadcrumbs = graph.find((item) => item["@type"] === "BreadcrumbList");
  assert.ok(article);
  assert.ok(breadcrumbs);
  const author = article["author"] as { name: string };
  const items = breadcrumbs["itemListElement"] as unknown[];

  assert.equal(article["@type"], "NewsArticle");
  assert.equal(article["headline"], seedStories[0].headline);
  assert.equal(article["datePublished"], seedStories[0].publishedAt);
  assert.equal(author.name, seedStories[0].author.name);
  assert.ok(Number(article["wordCount"]) > 0);
  assert.equal(breadcrumbs["@type"], "BreadcrumbList");
  assert.equal(items.length, 3);
});
