import assert from "node:assert/strict";
import test from "node:test";
import { pairingTargets } from "@harborline/contracts";
import {
  createPairingCredentials,
  formatUserCode,
  isValidPairingQrValue,
  normalizeDevicePayload,
  normalizeUserCode,
  pairingCodeLifetimeSeconds,
  pairingProcessingLifetimeSeconds,
  pairingRequestExpired,
  safePairingHashEqual,
} from "../src/lib/device-pairing";

process.env.DEVICE_PAIRING_PEPPER = "test-only-pairing-pepper-with-more-than-32-characters";

test("pairing contracts include every browser and television target", () => {
  assert.deepEqual(pairingTargets, ["tv", "androidtv", "roku", "web"]);
});

test("pairing codes normalize to a readable six-character code", () => {
  assert.equal(normalizeUserCode("ab2-c 34"), "AB2C34");
  assert.equal(formatUserCode("ab2c34"), "AB2-C34");
});

test("pairing secrets are high entropy and only hashes compare", () => {
  const pairing = createPairingCredentials();
  assert.match(pairing.userCode, /^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
  assert.match(pairing.deviceSecret, /^hln_pair_[A-Za-z0-9_-]{40,}$/);
  assert.match(pairing.claimNonce, /^hln_claim_[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(pairing.deviceSecret, pairing.deviceSecretHash);
  assert.notEqual(pairing.claimNonce, pairing.claimNonceHash);
  assert.equal(safePairingHashEqual(pairing.deviceSecret, pairing.deviceSecretHash), true);
  assert.equal(safePairingHashEqual(pairing.claimNonce, pairing.claimNonceHash), true);
  assert.equal(safePairingHashEqual(`${pairing.deviceSecret}x`, pairing.deviceSecretHash), false);
});

test("pairing rotates at 60 seconds and freezes into a bounded processing window", () => {
  assert.equal(pairingCodeLifetimeSeconds, 60);
  assert.equal(pairingProcessingLifetimeSeconds, 120);
  const now = new Date("2026-08-01T12:00:00.000Z");
  assert.equal(
    pairingRequestExpired(
      {
        status: "pending",
        expiresAt: new Date("2026-08-01T11:59:59.000Z"),
      },
      now,
    ),
    true,
  );
  assert.equal(
    pairingRequestExpired(
      {
        status: "processing",
        expiresAt: new Date("2026-08-01T11:59:00.000Z"),
        processingExpiresAt: new Date("2026-08-01T12:01:00.000Z"),
      },
      now,
    ),
    false,
  );
});

test("the QR renderer accepts only complete first-party pairing destinations", () => {
  const session = "67ac1912-52c2-4e1d-bcb9-4e12f0dd48ab";
  const nonce = `hln_claim_${"a".repeat(43)}`;
  const origin = "https://www.thejerseycourier.com";
  assert.equal(
    isValidPairingQrValue(
      `${origin}/login/tv?session=${session}&code=ABC-234&target=roku&nonce=${nonce}`,
      origin,
    ),
    true,
  );
  assert.equal(
    isValidPairingQrValue(
      `harborline://pair?session=${session}&code=ABC-234&target=web&nonce=${nonce}`,
      origin,
    ),
    true,
  );
  assert.equal(
    isValidPairingQrValue(
      `https://attacker.example/login/tv?session=${session}&code=ABC-234&target=roku&nonce=${nonce}`,
      origin,
    ),
    false,
  );
  assert.equal(isValidPairingQrValue("https://attacker.example", origin), false);
});

test("normalizes lowercase Roku JSON keys without changing values", () => {
  assert.deepEqual(
    normalizeDevicePayload(
      { target: "roku", devicename: "Roku", devicesecret: "secret" },
      ["target", "deviceName", "deviceSecret"],
    ),
    {
      target: "roku",
      devicename: "Roku",
      devicesecret: "secret",
      deviceName: "Roku",
      deviceSecret: "secret",
    },
  );
});

test("normalizes snake-case device payload aliases", () => {
  assert.deepEqual(
    normalizeDevicePayload(
      { installation_id: "roku_installation", app_version: "1.0.2" },
      ["installationId", "appVersion"],
    ),
    {
      installation_id: "roku_installation",
      app_version: "1.0.2",
      installationId: "roku_installation",
      appVersion: "1.0.2",
    },
  );
});
