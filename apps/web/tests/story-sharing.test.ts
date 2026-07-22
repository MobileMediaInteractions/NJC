import assert from "node:assert/strict";
import test from "node:test";
import { getStoryShareLinks, getStoryShareUrl } from "../src/lib/story-sharing";

test("X share intent includes the article headline and canonical URL", () => {
  const shareUrl = new URL(getStoryShareUrl({
    canonicalUrl: "/story/council-vote",
    headline: "Council approves Route 9 plan & new park",
    siteOrigin: "https://www.thejerseycourier.com",
    slug: "council-vote",
  }));

  assert.equal(shareUrl.origin, "https://x.com");
  assert.equal(shareUrl.pathname, "/intent/post");
  assert.equal(
    shareUrl.searchParams.get("text"),
    "Council approves Route 9 plan & new park\n\nhttps://www.thejerseycourier.com/story/council-vote",
  );
});

test("X share intent honors an absolute canonical URL", () => {
  const shareUrl = new URL(getStoryShareUrl({
    canonicalUrl: "https://www.thejerseycourier.com/investigations/school-budget",
    headline: "What the school budget means",
    siteOrigin: "https://njc-web.vercel.app",
    slug: "school-budget",
  }));

  assert.equal(
    shareUrl.searchParams.get("text"),
    "What the school budget means\n\nhttps://www.thejerseycourier.com/investigations/school-budget",
  );
});

test("article action links create a prefilled email and preserve the article URL", () => {
  const links = getStoryShareLinks({
    canonicalUrl: "/story/library-renovation",
    headline: "Library renovation begins Monday",
    siteOrigin: "https://www.thejerseycourier.com",
    slug: "library-renovation",
  });
  const email = new URL(links.emailUrl);

  assert.equal(links.articleUrl, "https://www.thejerseycourier.com/story/library-renovation");
  assert.equal(email.protocol, "mailto:");
  assert.equal(email.searchParams.get("subject"), "Library renovation begins Monday");
  assert.equal(
    email.searchParams.get("body"),
    "Library renovation begins Monday\n\nhttps://www.thejerseycourier.com/story/library-renovation",
  );
});
