import { InMemoryEd25519KeyProvider, ReferenceLicenseService, type ApplicationIdentity } from "../src/licensing/index";

export const firstPartyWebIdentity: ApplicationIdentity = { applicationId: "new-jersey-courier", platform: "web", environment: "development", buildId: "local-development", host: "localhost:3000" };
export const thirdPartyIdentity: ApplicationIdentity = { applicationId: "example-third-party", platform: "node", environment: "development", buildId: "example-1", bundleOrPackageId: "com.example.platformdemo" };

export function createDevelopmentLicenseFixture() {
  if (process.env.NODE_ENV === "production" || process.env.PLATFORM_DEV_LICENSE_MODE !== "true") throw new Error("Development license fixtures are disabled outside explicit non-production mode");
  const keys = new InMemoryEd25519KeyProvider();
  const service = new ReferenceLicenseService({ issuer: "https://licenses.platform.local", audience: "platform-runtime", keyPepper: "development-only-pepper-never-production", keys });
  service.registerOrganization({ id: "org-first-party", name: "First-party origin", status: "active" }); service.registerCustomer({ id: "customer-first-party", organizationId: "org-first-party" });
  service.registerOrganization({ id: "org-third-party", name: "Licensed example", status: "active" }); service.registerCustomer({ id: "customer-third-party", organizationId: "org-third-party" });
  service.registerProduct({ id: "platform-runtime", name: "Platform Runtime", featureIds: ["feature.diagnostics", "feature.status-card", "feature.animation"] });
  service.registerPlan({ id: "plan-first-party", productId: "platform-runtime", featureIds: ["feature.diagnostics", "feature.status-card", "feature.animation"], seatLimit: 100, deviceLimit: 100, leaseSeconds: 3600, offlineLeaseSeconds: 86400, graceSeconds: 300 });
  service.registerPlan({ id: "plan-development", productId: "platform-runtime", featureIds: ["feature.diagnostics", "feature.animation"], seatLimit: 2, deviceLimit: 2, leaseSeconds: 900, offlineLeaseSeconds: 3600, graceSeconds: 120 });
  service.registerApplication({ id: "app-first-party", organizationId: "org-first-party", productId: "platform-runtime", identities: [firstPartyWebIdentity] });
  service.registerApplication({ id: "app-third-party", organizationId: "org-third-party", productId: "platform-runtime", identities: [thirdPartyIdentity] });
  const firstParty = service.createFirstPartyEntitlement({ organizationId: "org-first-party", customerId: "customer-first-party", productId: "platform-runtime", applicationId: "app-first-party", planId: "plan-first-party", actor: "fixture-admin" });
  const thirdParty = service.createLicense({ organizationId: "org-third-party", customerId: "customer-third-party", productId: "platform-runtime", applicationId: "app-third-party", planId: "plan-development", kind: "development", idempotencyKey: "fixture-third-party", actor: "fixture-admin" });
  return { service, firstParty, thirdParty };
}
