import assert from "node:assert/strict";
import test from "node:test";
import {
  consentStorageKey,
  hasAdvertisingConsent,
  hasAnalyticsConsent,
  readConsentChoice,
} from "../src/lib/analytics-consent";

function storage(value: unknown): Pick<Storage, "getItem"> {
  return {
    getItem(key: string) {
      return key === consentStorageKey && value !== null
        ? String(value)
        : null;
    },
  };
}

test("essential-only consent enables neither analytics nor advertising", () => {
  const choice = storage(JSON.stringify({ value: "essential" }));
  assert.equal(readConsentChoice(choice), "essential");
  assert.equal(hasAnalyticsConsent(choice), false);
  assert.equal(hasAdvertisingConsent(choice), false);
});

test("analytics consent enables measurement without advertising", () => {
  const choice = storage(JSON.stringify({ value: "analytics" }));
  assert.equal(readConsentChoice(choice), "analytics");
  assert.equal(hasAnalyticsConsent(choice), true);
  assert.equal(hasAdvertisingConsent(choice), false);
});

test("analytics and ads consent enables both optional categories", () => {
  const choice = storage(JSON.stringify({ value: "analytics_ads" }));
  assert.equal(readConsentChoice(choice), "analytics_ads");
  assert.equal(hasAnalyticsConsent(choice), true);
  assert.equal(hasAdvertisingConsent(choice), true);
});

test("missing, malformed, or unknown consent fails closed", () => {
  for (const value of [
    null,
    "{not-json",
    JSON.stringify({ value: "all" }),
  ]) {
    const choice = storage(value);
    assert.equal(readConsentChoice(choice), null);
    assert.equal(hasAnalyticsConsent(choice), false);
    assert.equal(hasAdvertisingConsent(choice), false);
  }
});
