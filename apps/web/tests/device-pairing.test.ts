import assert from "node:assert/strict";
import test from "node:test";
import { pairingTargets } from "@harborline/contracts";
import {
  createPairingCredentials,
  formatUserCode,
  normalizeDevicePayload,
  normalizeUserCode,
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
  assert.notEqual(pairing.deviceSecret, pairing.deviceSecretHash);
  assert.equal(safePairingHashEqual(pairing.deviceSecret, pairing.deviceSecretHash), true);
  assert.equal(safePairingHashEqual(`${pairing.deviceSecret}x`, pairing.deviceSecretHash), false);
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
