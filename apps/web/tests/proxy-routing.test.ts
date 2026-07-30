import assert from "node:assert/strict";
import test from "node:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../src/proxy";

function isClerkRouted(
  pathname: string,
  hostname = "www.thejerseycourier.com",
) {
  return unstable_doesMiddlewareMatch({
    config,
    nextConfig: {},
    url: `https://${hostname}${pathname}`,
    headers: { host: hostname },
  });
}

test("public news and social crawler routes bypass Clerk middleware", () => {
  assert.equal(isClerkRouted("/"), false);
  assert.equal(isClerkRouted("/story/council-adopts-budget"), false);
  assert.equal(isClerkRouted("/story/council-adopts-budget?share=fresh"), false);
  assert.equal(isClerkRouted("/social/story/council-adopts-budget/image?v=fresh"), false);
  assert.equal(isClerkRouted("/api/v1/stories"), false);
  assert.equal(isClerkRouted("/api/v1/device-pairing"), false);
  assert.equal(isClerkRouted("/api/v1/device-pairing/pairing-id/poll"), false);
});

test("newsroom and account routes continue through Clerk middleware", () => {
  assert.equal(isClerkRouted("/studio"), true);
  assert.equal(isClerkRouted("/studio/stories/new"), true);
  assert.equal(isClerkRouted("/developers"), true);
  assert.equal(isClerkRouted("/profile"), true);
  assert.equal(isClerkRouted("/plus"), true);
  assert.equal(isClerkRouted("/plus/watch"), true);
  assert.equal(isClerkRouted("/api/v1/plus/catalog"), true);
  assert.equal(isClerkRouted("/distribution"), true);
  assert.equal(isClerkRouted("/distribution/package/private-release"), true);
  assert.equal(isClerkRouted("/api/v1/distribution/packages"), true);
  assert.equal(isClerkRouted("/api/v1/studio/stories"), true);
  assert.equal(isClerkRouted("/api/v1/employee/bootstrap"), true);
  assert.equal(isClerkRouted("/api/v1/push/subscriptions"), true);
  assert.equal(isClerkRouted("/api/v1/analytics/page-view"), true);
  assert.equal(isClerkRouted("/api/v1/device-pairing/pairing-id/approve"), true);
});

test("clean service-subdomain routes initialize Clerk before host rewrites", () => {
  assert.equal(isClerkRouted("/", "studio.thejerseycourier.com"), true);
  assert.equal(
    isClerkRouted("/stories/new", "studio.thejerseycourier.com"),
    true,
  );
  assert.equal(isClerkRouted("/", "api.thejerseycourier.com"), true);
  assert.equal(isClerkRouted("/", "plus.thejerseycourier.com"), true);
  assert.equal(isClerkRouted("/watch", "plus.thejerseycourier.com"), true);
  assert.equal(
    isClerkRouted("/", "distribution.thejerseycourier.com"),
    true,
  );
  assert.equal(
    isClerkRouted("/file/opaque-id", "distribution.thejerseycourier.com"),
    true,
  );
  assert.equal(
    isClerkRouted("/assets/brand/v1/mark.svg", "studio.thejerseycourier.com"),
    false,
  );
});
