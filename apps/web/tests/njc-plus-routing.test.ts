import assert from "node:assert/strict";
import test from "node:test";
import { getNjcPlusFallbackUrl } from "../src/lib/njc-plus-routing";

test("an unavailable NJC+ surface returns visitors to the canonical publication", () => {
  assert.equal(
    getNjcPlusFallbackUrl(),
    "https://www.thejerseycourier.com",
  );
});
