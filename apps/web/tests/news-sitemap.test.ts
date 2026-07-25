import assert from "node:assert/strict";
import test from "node:test";
import { buildNewsSitemap } from "../src/lib/news-sitemap";

const recentStory = {
  slug: "fresh-report",
  headline: "Fresh & verified <report>",
  publishedAt: "2026-07-25T12:00:00.000Z",
  updatedAt: "2026-07-25T12:00:00.000Z",
  noIndex: false,
};

test("news sitemap emits Google News metadata for recent stories", () => {
  const xml = buildNewsSitemap({
    origin: "https://www.thejerseycourier.com",
    publicationName: "The New Jersey Courier",
    recentStories: [recentStory],
  });

  assert.match(xml, /<news:news>/);
  assert.match(xml, /Fresh &amp; verified &lt;report&gt;/);
  assert.match(xml, /https:\/\/www\.thejerseycourier\.com\/story\/fresh-report/);
});

test("news sitemap retains a standard story URL when the two-day window is empty", () => {
  const xml = buildNewsSitemap({
    origin: "https://www.thejerseycourier.com",
    publicationName: "The New Jersey Courier",
    recentStories: [],
    fallbackStory: {
      ...recentStory,
      slug: "older-report",
      publishedAt: "2026-07-20T12:00:00.000Z",
    },
  });

  assert.match(xml, /<url>/);
  assert.match(xml, /\/story\/older-report/);
  assert.doesNotMatch(xml, /<news:news>/);
});

test("news sitemap remains valid before the first story is published", () => {
  const xml = buildNewsSitemap({
    origin: "https://www.thejerseycourier.com",
    publicationName: "The New Jersey Courier",
    recentStories: [],
  });

  assert.match(xml, /<loc>https:\/\/www\.thejerseycourier\.com<\/loc>/);
  assert.doesNotMatch(xml, /<news:news>/);
});
