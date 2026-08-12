import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmationForHostname,
  createDomainProvisioningChallenge,
  isTrustedDomainControlHost,
  verifyDomainProvisioningChallenge,
} from "../src/lib/domain-control-contract";
import {
  hostnameForLabel,
  isProvisioningBlocked,
  managedDomainCatalog,
} from "../src/lib/domain-registry";

test("domain catalog uses unique labels and exact Courier hostnames", () => {
  assert.equal(new Set(managedDomainCatalog.map((entry) => entry.label)).size, managedDomainCatalog.length);
  for (const entry of managedDomainCatalog) {
    assert.equal(hostnameForLabel(entry.label), `${entry.label}.thejerseycourier.com`);
  }
});

test("internal, CDN, active and external hosts cannot use generic provisioning", () => {
  for (const label of ["www", "studio", "api", "plus", "cdn", "links", "int", "status"] as const) {
    assert.equal(isProvisioningBlocked(label), true, label);
  }
  for (const label of ["press", "distribution", "support"] as const) {
    assert.equal(isProvisioningBlocked(label), false, label);
  }
});

test("signed previews are actor, hostname, time and signature bound", () => {
  const previous = process.env.DOMAIN_CONTROL_CHALLENGE_SECRET;
  process.env.DOMAIN_CONTROL_CHALLENGE_SECRET = "test-domain-control-secret-with-at-least-32-characters";
  try {
    const now = Date.parse("2026-08-11T12:00:00Z");
    const challenge = createDomainProvisioningChallenge("user_1", "press.thejerseycourier.com", now);
    assert.equal(verifyDomainProvisioningChallenge(challenge, { actor: "user_1", hostname: "press.thejerseycourier.com" }, now + 299_000), true);
    assert.equal(verifyDomainProvisioningChallenge(challenge, { actor: "user_2", hostname: "press.thejerseycourier.com" }, now), false);
    assert.equal(verifyDomainProvisioningChallenge(challenge, { actor: "user_1", hostname: "distribution.thejerseycourier.com" }, now), false);
    assert.equal(verifyDomainProvisioningChallenge(challenge, { actor: "user_1", hostname: "press.thejerseycourier.com" }, now + 301_000), false);
    assert.equal(verifyDomainProvisioningChallenge(`${challenge}x`, { actor: "user_1", hostname: "press.thejerseycourier.com" }, now), false);
  } finally {
    if (previous === undefined) delete process.env.DOMAIN_CONTROL_CHALLENGE_SECRET;
    else process.env.DOMAIN_CONTROL_CHALLENGE_SECRET = previous;
  }
});

test("production domain control only accepts the exact Studio hostname", () => {
  assert.equal(isTrustedDomainControlHost("studio.thejerseycourier.com", true), true);
  assert.equal(isTrustedDomainControlHost("studio.thejerseycourier.com:443", true), true);
  assert.equal(isTrustedDomainControlHost("www.thejerseycourier.com", true), false);
  assert.equal(isTrustedDomainControlHost("studio.thejerseycourier.com.attacker.test", true), false);
  assert.equal(isTrustedDomainControlHost("localhost:3000", false), true);
  assert.equal(isTrustedDomainControlHost("localhost:3000", true), false);
});

test("confirmation phrase includes the entire exact hostname", () => {
  assert.equal(confirmationForHostname("press.thejerseycourier.com"), "CREATE press.thejerseycourier.com");
});
