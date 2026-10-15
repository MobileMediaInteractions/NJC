import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getStoryShortUrl, storyIdFromShortCode, storyShortCode } from "../src/lib/story-short-code";
import { createStoryShortLinkHandler } from "../src/lib/story-short-link-handler";

const id = "12345678-1234-4234-9234-123456789abc";
const origin = "https://www.thejerseycourier.com";
const code = storyShortCode(id)!;
const updatedAt = new Date("2026-10-15T12:00:00Z");
const context = { params: Promise.resolve({ code }) };

test("short IDs losslessly encode UUIDs, including leading zeros and the full 128-bit range", () => {
  for (const uuid of [id, "00000000-0000-0000-0000-000000000000", "ffffffff-ffff-ffff-ffff-ffffffffffff", ...Array.from({ length: 1000 }, () => randomUUID())]) {
    const encoded = storyShortCode(uuid)!;
    assert.match(encoded, /^[0-9a-zA-Z]{22}$/);
    assert.equal(storyIdFromShortCode(encoded), uuid);
  }
  assert.equal(storyShortCode(id.toUpperCase()), code);
  assert.equal(getStoryShortUrl(id, origin), `${origin}/s/${code}`);
});

test("invalid, overflowing, aliased and path-shaped codes are rejected", () => {
  for (const value of ["", "abc", "../story", "x".repeat(23), "_".repeat(22), "Z".repeat(22), `${code}?redirect=https://evil.example`, ` ${code}`, `%2f${code}`]) {
    assert.equal(storyIdFromShortCode(value), null);
  }
  assert.equal(storyShortCode("not-a-uuid"), null);
  assert.equal(getStoryShortUrl(undefined, origin), null);
});

test("GET and HEAD-compatible redirects use the current slug and canonical site, not the request host", async () => {
  let requestedId = "";
  let slug = "original-headline";
  const handler = createStoryShortLinkHandler({
    siteOrigin: () => origin,
    findPublishedStory: async (value) => { requestedId = value; return { slug, updatedAt }; },
    onError: assert.fail,
  });
  for (const method of ["GET", "HEAD"]) {
    const response = await handler(new Request(`https://untrusted.example/s/${code}`, { method }), context);
    assert.equal(response.status, 307);
    assert.equal(requestedId, id);
    assert.equal(new URL(response.headers.get("location")!).origin, origin);
    assert.equal(new URL(response.headers.get("location")!).pathname, `/story/${slug}`);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(await response.text(), "");
    slug = "corrected-headline";
  }
});

test("only allowlisted campaign attribution passes through; redirects and arbitrary parameters do not", async () => {
  const handler = createStoryShortLinkHandler({ siteOrigin: () => origin, findPublishedStory: async () => ({ slug: "a/b", updatedAt }), onError: assert.fail });
  const response = await handler(new Request(`${origin}/s/${code}?utm_source=x&utm_medium=social&redirect=https://evil.example&share=attacker&secret=no&utm_term=${"a".repeat(257)}`), context);
  const destination = new URL(response.headers.get("location")!);
  assert.equal(destination.pathname, "/story/a%2Fb");
  assert.equal(destination.searchParams.get("utm_source"), "x");
  assert.equal(destination.searchParams.get("utm_medium"), "social");
  assert.equal(destination.searchParams.get("share"), updatedAt.getTime().toString(36));
  for (const key of ["secret", "redirect", "utm_term"]) assert.equal(destination.searchParams.has(key), false);
});

test("unknown, deleted and no-longer-public stories fail closed without caching or a redirect", async () => {
  const handler = createStoryShortLinkHandler({ siteOrigin: () => origin, findPublishedStory: async () => null, onError: assert.fail });
  const response = await handler(new Request(`${origin}/s/${code}`), context);
  assert.equal(response.status, 404);
  assert.equal(response.headers.has("location"), false);
  assert.match(response.headers.get("cache-control")!, /no-store/);
});

test("malformed codes never query the database; outages return a retryable 503, not a false 404", async () => {
  let lookups = 0;
  let failures = 0;
  const handler = createStoryShortLinkHandler({
    siteOrigin: () => origin,
    findPublishedStory: async () => { lookups++; throw new Error("unavailable"); },
    onError: () => { failures++; },
  });
  assert.equal((await handler(new Request(`${origin}/s/bad`), { params: Promise.resolve({ code: "bad" }) })).status, 404);
  assert.equal(lookups, 0);
  const response = await handler(new Request(`${origin}/s/${code}`), context);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.has("location"), false);
  assert.equal(failures, 1);
});

test("route constrains the indexed ID lookup to published, nonfuture articles, and both designs receive the ID", () => {
  const route = readFileSync(new URL("../src/app/s/[code]/route.ts", import.meta.url), "utf8");
  assert.match(route, /eq\(stories\.id, id\)/);
  assert.match(route, /eq\(stories\.status, "published"\)/);
  assert.match(route, /lte\(stories\.publishedAt, new Date\(\)\)/);
  assert.match(route, /export const HEAD = GET/);
  const page = readFileSync(new URL("../src/app/(site)/story/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /storyId: story\.id/);
  assert.match(page, /shareLinks=\{shareLinks\}/);
  assert.match(page, /<StoryActions \{\.\.\.shareLinks\}/);
});
