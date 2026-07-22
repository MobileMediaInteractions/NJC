import assert from "node:assert/strict";
import test from "node:test";
import { getStoryShareUrl } from "../src/lib/story-sharing";

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
