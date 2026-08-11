import assert from "node:assert/strict";
import test from "node:test";
import { hasInternalOriginProof, internalBoundaryConfigured, isAcceptedInternalHost, normalizeHost, verifyInternalPerimeter } from "../src/lib/internal-boundary";

test("host normalization removes only a port", () => {
  assert.equal(normalizeHost("INT.THEJERSEYCOURIER.COM:443"), "int.thejerseycourier.com");
  assert.equal(normalizeHost("int.thejerseycourier.com.evil.test"), "int.thejerseycourier.com.evil.test");
});

test("production accepts only the configured internal host", () => {
  const prior = process.env.INTERNAL_HOST;
  process.env.INTERNAL_HOST = "int.thejerseycourier.com";
  assert.equal(isAcceptedInternalHost("int.thejerseycourier.com", "production"), true);
  assert.equal(isAcceptedInternalHost("studio.thejerseycourier.com", "production"), false);
  assert.equal(isAcceptedInternalHost("njc-internal.vercel.app", "production"), false);
  assert.equal(isAcceptedInternalHost("localhost:3020", "production"), false);
  if (prior === undefined) delete process.env.INTERNAL_HOST; else process.env.INTERNAL_HOST = prior;
});

test("the boundary fails closed until every perimeter setting is explicit", () => {
  const prior = { enabled: process.env.INTERNAL_HOST_ENABLED, team: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN, aud: process.env.CLOUDFLARE_ACCESS_AUD, origin: process.env.INTERNAL_ORIGIN_SECRET };
  process.env.INTERNAL_HOST_ENABLED = "false";
  process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN = "example.cloudflareaccess.com";
  process.env.CLOUDFLARE_ACCESS_AUD = "aud";
  process.env.INTERNAL_ORIGIN_SECRET = "0123456789abcdef0123456789abcdef";
  assert.equal(internalBoundaryConfigured(), false);
  process.env.INTERNAL_HOST_ENABLED = "true";
  delete process.env.CLOUDFLARE_ACCESS_AUD;
  assert.equal(internalBoundaryConfigured(), false);
  for (const [key, value] of Object.entries(prior)) {
    const env = key === "enabled" ? "INTERNAL_HOST_ENABLED" : key === "team" ? "CLOUDFLARE_ACCESS_TEAM_DOMAIN" : key === "aud" ? "CLOUDFLARE_ACCESS_AUD" : "INTERNAL_ORIGIN_SECRET";
    if (value === undefined) delete process.env[env]; else process.env[env] = value;
  }
});

test("raw origins need the private Cloudflare-to-origin proof", () => {
  const prior = process.env.INTERNAL_ORIGIN_SECRET;
  process.env.INTERNAL_ORIGIN_SECRET = "0123456789abcdef0123456789abcdef";
  assert.equal(hasInternalOriginProof(new Headers()), false);
  assert.equal(hasInternalOriginProof(new Headers({ "x-njc-internal-origin": "wrongwrongwrongwrongwrongwrongwrong12" })), false);
  assert.equal(hasInternalOriginProof(new Headers({ "x-njc-internal-origin": "0123456789abcdef0123456789abcdef" })), true);
  if (prior === undefined) delete process.env.INTERNAL_ORIGIN_SECRET; else process.env.INTERNAL_ORIGIN_SECRET = prior;
});

test("an unsigned or malformed Access assertion never reaches identity lookup", async () => {
  const keys = ["INTERNAL_HOST_ENABLED", "INTERNAL_HOST", "CLOUDFLARE_ACCESS_TEAM_DOMAIN", "CLOUDFLARE_ACCESS_AUD", "INTERNAL_ORIGIN_SECRET"] as const;
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.INTERNAL_HOST_ENABLED = "true";
  process.env.INTERNAL_HOST = "int.thejerseycourier.com";
  process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN = "example.cloudflareaccess.com";
  process.env.CLOUDFLARE_ACCESS_AUD = "internal-audience";
  process.env.INTERNAL_ORIGIN_SECRET = "0123456789abcdef0123456789abcdef";
  const headers = new Headers({
    host: "int.thejerseycourier.com",
    "x-njc-internal-origin": "0123456789abcdef0123456789abcdef",
    "cf-access-jwt-assertion": "not-a-signed-jwt",
  });
  assert.equal(await verifyInternalPerimeter(headers), null);
  for (const key of keys) {
    if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
  }
});
