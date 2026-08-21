import assert from "node:assert/strict";
import test from "node:test";
import {
  createSiteDesignPreviewToken,
  productionSiteDesign,
  resolveSiteDesign,
  siteDesignEnvironmentOverride,
  siteDesignPreviewCookieDomain,
  siteDesignPreviewRedirectOrigin,
  siteDesignPreviewTarget,
  verifySiteDesignPreviewToken,
} from "../src/lib/site-design";

const secret = "test-only-design-preview-secret-with-32-bytes";
const now = Date.UTC(2026, 7, 21, 12, 0, 0);

test("production design changes only in the explicit V2 production state", () => {
  assert.equal(productionSiteDesign("legacy"), "legacy");
  assert.equal(productionSiteDesign("v2-preview"), "legacy");
  assert.equal(productionSiteDesign("v2-production"), "v2");
});

test("a valid staff preview overrides the production presentation only", () => {
  assert.equal(resolveSiteDesign({ mode: "legacy", preview: "v2" }), "v2");
  assert.equal(resolveSiteDesign({ mode: "v2-production", preview: "legacy" }), "legacy");
  assert.equal(resolveSiteDesign({ mode: "v2-preview" }), "legacy");
  assert.equal(resolveSiteDesign({ mode: "legacy", environmentOverride: "v2" }), "v2");
  assert.equal(resolveSiteDesign({ mode: "legacy", environmentOverride: "legacy", preview: "v2" }), "v2");
});

test("preview tokens are signed, bounded and fail closed", () => {
  const token = createSiteDesignPreviewToken("v2", now, secret);
  assert.ok(token);
  assert.equal(verifySiteDesignPreviewToken(token, now + 30_000, secret), "v2");
  assert.equal(verifySiteDesignPreviewToken(`${token}tampered`, now + 30_000, secret), null);
  assert.equal(verifySiteDesignPreviewToken(token, now + 5 * 60 * 60 * 1_000, secret), null);
  assert.equal(verifySiteDesignPreviewToken(token, now + 30_000, `${secret}-wrong`), null);
});

test("preview return paths cannot escape the selected first-party origin", () => {
  assert.equal(
    siteDesignPreviewTarget("/story/courier?view=full", "https://www.thejerseycourier.com")?.href,
    "https://www.thejerseycourier.com/story/courier?view=full",
  );
  assert.equal(siteDesignPreviewTarget("//evil.example/phish", "https://www.thejerseycourier.com"), null);
  assert.equal(siteDesignPreviewTarget("/\\evil.example/phish", "https://www.thejerseycourier.com"), null);
  assert.equal(siteDesignPreviewTarget("https://evil.example/phish", "https://www.thejerseycourier.com"), null);
});

test("custom subdomains share canonical previews while Vercel and local previews stay on their request host", () => {
  const canonical = "https://www.thejerseycourier.com";
  assert.equal(siteDesignPreviewCookieDomain("studio.thejerseycourier.com"), ".thejerseycourier.com");
  assert.equal(
    siteDesignPreviewRedirectOrigin(new URL("https://studio.thejerseycourier.com/api/preview"), canonical),
    canonical,
  );
  assert.equal(siteDesignPreviewCookieDomain("njc-web.vercel.app"), undefined);
  assert.equal(
    siteDesignPreviewRedirectOrigin(new URL("https://njc-web.vercel.app/api/preview"), canonical),
    "https://njc-web.vercel.app",
  );
  assert.equal(
    siteDesignPreviewRedirectOrigin(new URL("http://localhost:3100/api/preview"), canonical),
    "http://localhost:3100",
  );
});

test("only supported environment renderer overrides are accepted", () => {
  assert.equal(siteDesignEnvironmentOverride("legacy"), "legacy");
  assert.equal(siteDesignEnvironmentOverride("v2"), "v2");
  assert.equal(siteDesignEnvironmentOverride("preview"), null);
  assert.equal(siteDesignEnvironmentOverride(""), null);
});
