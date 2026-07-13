import assert from "node:assert/strict";
import test from "node:test";
import { createApiKeySecret, extractPrefix, hashApiKey } from "../src/lib/api-keys";

process.env.API_KEY_PEPPER = "test-only-pepper-that-is-long-and-unique";

test("developer API keys expose only a parseable prefix and stable HMAC", () => {
  const generated = createApiKeySecret();
  assert.equal(extractPrefix(generated.rawKey), generated.prefix);
  assert.equal(hashApiKey(generated.rawKey), generated.keyHash);
  assert.notEqual(generated.rawKey, generated.keyHash);
  assert.equal(generated.rawKey.includes(generated.keyHash), false);
});

test("malformed keys are rejected before database lookup", () => {
  assert.equal(extractPrefix("hln_live_short_secret"), null);
  assert.equal(extractPrefix("other_live_123456789012_long-enough-secret-value"), null);
});
