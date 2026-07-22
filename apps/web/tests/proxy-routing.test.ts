import assert from "node:assert/strict";
import test from "node:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../src/proxy";

function isClerkRouted(pathname: string) {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `https://www.thejerseycourier.com${pathname}` });
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
  assert.equal(isClerkRouted("/api/v1/studio/stories"), true);
  assert.equal(isClerkRouted("/api/v1/employee/bootstrap"), true);
  assert.equal(isClerkRouted("/api/v1/device-pairing/pairing-id/approve"), true);
});
