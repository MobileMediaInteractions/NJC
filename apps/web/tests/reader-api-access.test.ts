import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReaderApiAccess } from "../src/lib/reader-api-access";

test("reader API accepts same-origin website requests on both production domains", () => {
  const custom = evaluateReaderApiAccess(new Request("https://www.thejerseycourier.com/api/v1/stories", { headers: { "Sec-Fetch-Site": "same-origin" } }));
  const vercel = evaluateReaderApiAccess(new Request("https://njc-web.vercel.app/api/v1/stories", { headers: { Referer: "https://njc-web.vercel.app/latest" } }));
  assert.deepEqual(custom, { allowed: true, source: "web", origin: "https://www.thejerseycourier.com" });
  assert.deepEqual(vercel, { allowed: true, source: "web", origin: "https://njc-web.vercel.app" });
});

test("reader API rejects direct and cross-site access", () => {
  assert.deepEqual(evaluateReaderApiAccess(new Request("https://www.thejerseycourier.com/api/v1/stories")), { allowed: false });
  assert.deepEqual(evaluateReaderApiAccess(new Request("https://njc-web.vercel.app/api/v1/stories", { headers: { Origin: "https://example.com", "Sec-Fetch-Site": "cross-site" } })), { allowed: false });
});

test("reader API recognizes official app clients only on an official API origin", () => {
  const roku = evaluateReaderApiAccess(new Request("https://njc-web.vercel.app/api/v1/stories", { headers: { "X-NJC-Client": "roku" } }));
  const installedRoku = evaluateReaderApiAccess(new Request("https://njc-web.vercel.app/api/v1/stories", { headers: { "User-Agent": "NJCourier-Roku/1.0.0" } }));
  const unknown = evaluateReaderApiAccess(new Request("https://njc-web.vercel.app/api/v1/stories", { headers: { "X-NJC-Client": "scraper" } }));
  const wrongHost = evaluateReaderApiAccess(new Request("https://example.com/api/v1/stories", { headers: { "X-NJC-Client": "roku" } }));
  assert.deepEqual(roku, { allowed: true, source: "roku", origin: null });
  assert.deepEqual(installedRoku, { allowed: true, source: "roku", origin: null });
  assert.deepEqual(unknown, { allowed: false });
  assert.deepEqual(wrongHost, { allowed: false });
});

test("reader API remains available to same-origin local development", () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.deepEqual(evaluateReaderApiAccess(new Request("http://localhost:3000/api/v1/stories", { headers: { "Sec-Fetch-Site": "same-origin" } })), { allowed: true, source: "web", origin: "http://localhost:3000" });
});
