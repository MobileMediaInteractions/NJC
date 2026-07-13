import assert from "node:assert/strict";
import test from "node:test";
import { createPairingCredentials, formatUserCode, normalizeUserCode, safePairingHashEqual } from "../src/lib/device-pairing";

process.env.DEVICE_PAIRING_PEPPER = "test-only-pairing-pepper-with-more-than-32-characters";

test("pairing codes normalize to a readable six-character code", () => {
  assert.equal(normalizeUserCode("ab2-c 34"), "AB2C34");
  assert.equal(formatUserCode("ab2c34"), "AB2-C34");
});

test("pairing secrets are high entropy and only hashes compare", () => {
  const pairing = createPairingCredentials();
  assert.match(pairing.userCode, /^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
  assert.match(pairing.deviceSecret, /^hln_pair_[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(pairing.deviceSecret, pairing.deviceSecretHash);
  assert.equal(safePairingHashEqual(pairing.deviceSecret, pairing.deviceSecretHash), true);
  assert.equal(safePairingHashEqual(`${pairing.deviceSecret}x`, pairing.deviceSecretHash), false);
});
