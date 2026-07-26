import assert from "node:assert/strict";
import test from "node:test";
import { getNjcPlusFallbackUrl } from "../src/lib/njc-plus-routing";

test("an unavailable NJC+ surface returns visitors to the canonical publication", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.thejerseycourier.com/";

  try {
    assert.equal(
      getNjcPlusFallbackUrl(),
      "https://www.thejerseycourier.com",
    );
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
});
