import assert from "node:assert/strict";
import test from "node:test";
import { getStoryShareLinks, getStoryShareUrl, getStorySocialImageUrl } from "../src/lib/story-sharing";

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

test("updated stories use versioned share and social-image URLs for crawler cache refresh", () => {
  const updatedAt = "2026-07-22T20:30:00.000Z";
  const links = getStoryShareLinks({
    headline: "Council adopts the revised budget",
    siteOrigin: "https://www.thejerseycourier.com",
    slug: "revised-budget",
    updatedAt,
  });
  const shareUrl = new URL(links.shareUrl);
  const socialImageUrl = new URL(getStorySocialImageUrl({
    siteOrigin: "https://www.thejerseycourier.com",
    slug: "revised-budget",
    updatedAt,
  }));

  assert.equal(links.articleUrl, "https://www.thejerseycourier.com/story/revised-budget");
  assert.ok(shareUrl.searchParams.get("share"));
  assert.equal(socialImageUrl.pathname, "/social/story/revised-budget/image");
  assert.equal(socialImageUrl.searchParams.get("v"), shareUrl.searchParams.get("share"));
  assert.match(decodeURIComponent(new URL(links.xUrl).searchParams.get("text") ?? ""), /\?share=/);
});
