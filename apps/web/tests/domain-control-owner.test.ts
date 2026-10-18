import assert from "node:assert/strict";
import test from "node:test";
import { domainControlOwnerEmail, isSameOriginDomainMutation, isVerifiedDomainControlOwner, safeDomainControlError } from "../src/lib/domain-control-access";
import { allowedDomainDnsApi, planHostingCname, validateVercelCnameTarget } from "../src/lib/domain-dns-contract";
import { getVisibleStudioNavigation } from "../src/lib/studio-navigation";
import { createDomainProvisioningChallenge, verifyDomainProvisioningChallenge } from "../src/lib/domain-control-contract";

const owner = { clerkId: "user_owner", identityClerkId: "user_owner", role: "admin", email: domainControlOwnerEmail, emailVerified: true };

test("only the authenticated, verified owner with administrator role may operate", () => {
  assert.equal(isVerifiedDomainControlOwner(owner), true);
  assert.equal(isVerifiedDomainControlOwner({ ...owner, email: " AlanMichaelsen12@gmail.com " }), true);
  for (const changes of [{ email: "another-admin@example.com" }, { role: "editor" }, { role: "reader" }, { emailVerified: false }, { identityClerkId: "other" }, { clerkId: "" }, { email: "alanmichaelsen12+admin@gmail.com" }, { email: "alanmichaelsen12@gmail.com.attacker.test" }]) {
    assert.equal(isVerifiedDomainControlOwner({ ...owner, ...changes }), false, JSON.stringify(changes));
  }
});

test("optional immutable account pin narrows owner access and never grants another email", () => {
  assert.equal(isVerifiedDomainControlOwner(owner, ["user_owner"]), true);
  assert.equal(isVerifiedDomainControlOwner(owner, ["different_id"]), false);
  assert.equal(isVerifiedDomainControlOwner({ ...owner, email: "another-admin@example.com" }, ["user_owner"]), false);
});

test("navigation and command-palette source hubs hide Domain Control by default", () => {
  const context = { role: "admin" as const, chatEnabled: true, pressEnabled: true, alertsEnabled: true, financeEnabled: true };
  const visible = (allowed?: boolean, role = context.role as string) => getVisibleStudioNavigation({ ...context, role: role as "admin", domainControlAllowed: allowed }).flatMap((hub) => hub.items).some((item) => item.id === "domain-control");
  assert.equal(visible(), false);
  assert.equal(visible(false), false);
  assert.equal(visible(true), true);
  assert.equal(visible(true, "editor"), false);
});

test("mutations require the exact same-origin production Studio browser context", () => {
  const request = (origin?: string, site = "same-origin", host = "studio.thejerseycourier.com") => new Request("https://studio.thejerseycourier.com/api/v1/studio/domains", { method: "POST", headers: { host, ...(origin ? { origin } : {}), "sec-fetch-site": site } });
  assert.equal(isSameOriginDomainMutation(request("https://studio.thejerseycourier.com"), true), true);
  for (const origin of [undefined, "null", "https://attacker.test", "http://studio.thejerseycourier.com", "https://studio.thejerseycourier.com.attacker.test", "https://studio.thejerseycourier.com/path"]) assert.equal(isSameOriginDomainMutation(request(origin), true), false);
  assert.equal(isSameOriginDomainMutation(request("https://studio.thejerseycourier.com", "cross-site"), true), false);
  assert.equal(isSameOriginDomainMutation(request("http://localhost:3000", "same-origin", "localhost:3000"), false), true);
  assert.equal(isSameOriginDomainMutation(request("http://localhost:3000", "same-origin", "localhost:3000"), true), false);
});

test("provider credentials cannot be forwarded to arbitrary DNS endpoints", () => {
  assert.equal(allowedDomainDnsApi(undefined), "https://api.hosting.ionos.com/dns");
  assert.equal(allowedDomainDnsApi("https://api.hosting.ionos.com/dns/"), "https://api.hosting.ionos.com/dns");
  for (const url of ["https://attacker.test", "http://api.hosting.ionos.com/dns", "https://api.hosting.ionos.com.attacker.test/dns", "https://dns.de-fra.ionos.com"]) assert.throws(() => allowedDomainDnsApi(url));
});

test("IONOS Hosting creates exactly one FQDN CNAME in the correct zone", () => {
  assert.deepEqual(planHostingCname({ name: "thejerseycourier.com", records: [] }, "press", "637644a6ea56a9c4.vercel-dns-017.com."), {
    existingId: null, record: { name: "press.thejerseycourier.com", type: "CNAME", content: "637644a6ea56a9c4.vercel-dns-017.com", ttl: 300, disabled: false },
  });
});

test("already-correct CNAMEs are idempotent and unrelated mail records are untouched", () => {
  const zone = { name: "thejerseycourier.com.", records: [{ id: "record", name: "press.thejerseycourier.com.", type: "CNAME", content: "cname.vercel-dns.com." }, { name: "thejerseycourier.com", type: "MX", content: "mail.example.com" }] };
  assert.deepEqual(planHostingCname(zone, "press", "cname.vercel-dns.com"), { existingId: "record", record: null });
  assert.equal(zone.records.length, 2);
});

test("conflicting, disabled or wrong-zone records never get replaced or deactivated", () => {
  for (const record of [
    { name: "press.thejerseycourier.com", type: "A", content: "192.0.2.1" },
    { name: "press.thejerseycourier.com", type: "TXT", content: "verification" },
    { name: "press.thejerseycourier.com", type: "CNAME", content: "another.example.com" },
    { name: "press.thejerseycourier.com", type: "CNAME", content: "cname.vercel-dns.com", disabled: true },
  ]) assert.throws(() => planHostingCname({ name: "thejerseycourier.com", records: [record] }, "press", "cname.vercel-dns.com"), /conflict/);
  assert.throws(() => planHostingCname({ name: "another-domain.com", records: [] }, "press", "cname.vercel-dns.com"), /not the Courier zone/);
  assert.throws(() => planHostingCname({ name: "thejerseycourier.com" }, "../www", "cname.vercel-dns.com"));
});

test("DNS targets must come from the supported Vercel DNS namespace", () => {
  for (const value of ["cname.vercel-dns.com", "637644a6ea56a9c4.vercel-dns-017.com."]) assert.ok(validateVercelCnameTarget(value));
  for (const value of ["evil.example", "cname.vercel-dns.com.evil.example", "https://cname.vercel-dns.com", "192.0.2.1"]) assert.throws(() => validateVercelCnameTarget(value));
});

test("fresh previews have independent nonces and expire at the exact five-minute boundary", () => {
  const previous = process.env.DOMAIN_CONTROL_CHALLENGE_SECRET;
  process.env.DOMAIN_CONTROL_CHALLENGE_SECRET = "test-only-domain-preview-signing-secret-long-enough";
  try {
    const now = Date.now();
    const first = createDomainProvisioningChallenge("owner", "press.thejerseycourier.com", now);
    const second = createDomainProvisioningChallenge("owner", "press.thejerseycourier.com", now);
    assert.notEqual(first, second);
    assert.equal(verifyDomainProvisioningChallenge(first, { actor: "owner", hostname: "press.thejerseycourier.com" }, now + 300_000), false);
    assert.equal(verifyDomainProvisioningChallenge(first, { actor: "owner", hostname: "press.thejerseycourier.com" }, now - 1), false);
  } finally {
    if (previous === undefined) delete process.env.DOMAIN_CONTROL_CHALLENGE_SECRET; else process.env.DOMAIN_CONTROL_CHALLENGE_SECRET = previous;
  }
});

test("unexpected provider/database errors never expose their original secret-bearing message", () => {
  assert.doesNotMatch(safeDomainControlError(new Error("connect postgres://secret-password@host")), /secret-password|postgres/);
  assert.match(safeDomainControlError(new Error("Existing DNS records conflict with this change. Review them at IONOS")), /conflict/);
});
