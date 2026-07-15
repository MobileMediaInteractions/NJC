import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  platformActivations,
  platformApplicationIdentities,
  platformApplications,
  platformIdempotencyRecords,
  platformInstallations,
  platformLicenseAudit,
  platformLicenses,
  platformLicenseVersions,
  platformOfflineLeases,
  platformPlanEntitlements,
  platformPlans,
  platformSigningKeys,
} from "@harborline/backend/schema";
import {
  canonicalJson,
  signReceipt,
  verifySignedReceipt,
  type ApplicationIdentity,
  type ReceiptClaims,
  type SignedReceipt,
  type SigningKeyProvider,
  type SigningKeyRecord,
} from "@platform/runtime/licensing";

const issuer = process.env.PLATFORM_LICENSE_ISSUER ?? "https://license.invalid";
const audience = process.env.PLATFORM_LICENSE_AUDIENCE ?? "platform-runtime";

export class PlatformLicenseError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function required(name: string) {
  const value = process.env[name]?.replaceAll("\\n", "\n");
  if (!value) throw new PlatformLicenseError("service_not_configured", `${name} is not configured`, 503);
  return value;
}

class EnvironmentSigningKeyProvider implements SigningKeyProvider {
  async activeKey(): Promise<{ keyId: string; privateKey: KeyObject }> {
    return {
      keyId: required("PLATFORM_LICENSE_KEY_ID"),
      privateKey: createPrivateKey(required("PLATFORM_ED25519_PRIVATE_KEY_PEM")),
    };
  }

  async publicKeys(): Promise<SigningKeyRecord[]> {
    const keyId = required("PLATFORM_LICENSE_KEY_ID");
    const configuredPublic = process.env.PLATFORM_ED25519_PUBLIC_KEY_PEM?.replaceAll("\\n", "\n");
    const publicKey = configuredPublic
      ? createPublicKey(configuredPublic)
      : createPublicKey(createPrivateKey(required("PLATFORM_ED25519_PRIVATE_KEY_PEM")));
    const active: SigningKeyRecord = {
      id: keyId,
      algorithm: "Ed25519",
      publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
      status: "active",
      createdAt: new Date(0).toISOString(),
    };
    const previous = process.env.PLATFORM_ED25519_PREVIOUS_PUBLIC_KEYS_JSON;
    if (!previous) return [active];
    try {
      const parsed = JSON.parse(previous) as SigningKeyRecord[];
      return [active, ...parsed.filter((item) => item.id !== keyId && item.algorithm === "Ed25519")];
    } catch {
      throw new PlatformLicenseError("service_not_configured", "Previous public signing keys JSON is invalid", 503);
    }
  }

  async rotate(): Promise<SigningKeyRecord> {
    throw new PlatformLicenseError(
      "external_rotation_required",
      "Signing keys are deployment secrets; rotate them in the secret manager and redeploy.",
      501,
    );
  }
}

const signingKeys = new EnvironmentSigningKeyProvider();
const applicationPlatforms = new Set(["web", "ios", "android", "tvos", "androidtv", "roku", "node"]);

function assertDatabase() {
  if (!hasDatabase()) throw new PlatformLicenseError("service_not_configured", "DATABASE_URL is not configured", 503);
}

function hashSecret(value: string, pepperName: string) {
  return createHmac("sha256", required(pepperName)).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function exactIdentity(row: typeof platformApplicationIdentities.$inferSelect): ApplicationIdentity {
  if (!applicationPlatforms.has(row.platform)) throw new PlatformLicenseError("invalid_application", "Registered platform is invalid", 500);
  return {
    applicationId: row.applicationId,
    platform: row.platform as ApplicationIdentity["platform"],
    environment: row.environment,
    buildId: row.buildId,
    ...(row.bundleOrPackageId ? { bundleOrPackageId: row.bundleOrPackageId } : {}),
    ...(row.signingIdentity ? { signingIdentity: row.signingIdentity } : {}),
    ...(row.host ? { host: row.host } : {}),
  };
}

function sameIdentity(expected: ApplicationIdentity, received: ApplicationIdentity) {
  return expected.applicationId === received.applicationId
    && expected.platform === received.platform
    && expected.environment === received.environment
    && expected.buildId === received.buildId
    && expected.bundleOrPackageId === received.bundleOrPackageId
    && expected.signingIdentity === received.signingIdentity
    && expected.host === received.host;
}

async function writeAudit(actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await getDb().insert(platformLicenseAudit).values({ actor, action, targetType, targetId, metadata });
}

async function resolveLicense(licenseId: string) {
  assertDatabase();
  const [result] = await getDb()
    .select({ license: platformLicenses, plan: platformPlans, application: platformApplications })
    .from(platformLicenses)
    .innerJoin(platformPlans, eq(platformLicenses.planId, platformPlans.id))
    .innerJoin(platformApplications, eq(platformLicenses.applicationId, platformApplications.id))
    .where(eq(platformLicenses.id, licenseId))
    .limit(1);
  if (!result) throw new PlatformLicenseError("license_not_found", "License was not found", 404);
  const now = Date.now();
  if (result.license.status !== "active") throw new PlatformLicenseError("license_unavailable", `License is ${result.license.status}`, 403);
  if (result.license.startsAt.getTime() > now) throw new PlatformLicenseError("license_not_started", "License is not active yet", 403);
  if (result.license.expiresAt && result.license.expiresAt.getTime() <= now) throw new PlatformLicenseError("license_expired", "License is expired", 403);
  if (result.application.status !== "active") throw new PlatformLicenseError("application_unavailable", "Application is not active", 403);
  return result;
}

async function resolveRegisteredIdentity(applicationId: string, received: ApplicationIdentity) {
  const identities = await getDb()
    .select()
    .from(platformApplicationIdentities)
    .where(eq(platformApplicationIdentities.applicationId, applicationId));
  const match = identities.find((row) => sameIdentity(exactIdentity(row), received));
  if (!match) throw new PlatformLicenseError("wrong_application", "Application identity is not registered for this license", 403);
  return match;
}

async function issueReceipt(
  license: typeof platformLicenses.$inferSelect,
  plan: typeof platformPlans.$inferSelect,
  identity: ApplicationIdentity,
  installationId: string,
  offline: boolean,
) {
  const entitlements = await getDb()
    .select({ featureId: platformPlanEntitlements.featureId })
    .from(platformPlanEntitlements)
    .where(eq(platformPlanEntitlements.planId, plan.id));
  const now = new Date();
  const leaseSeconds = offline ? plan.offlineLeaseSeconds : plan.onlineLeaseSeconds;
  const claims: ReceiptClaims = {
    receiptVersion: 1,
    licenseId: license.id,
    licenseVersion: license.version,
    licenseKind: license.kind,
    issuer,
    audience,
    organizationId: license.organizationId,
    productId: license.productId,
    application: identity,
    entitledFeatures: entitlements.map(({ featureId }) => featureId).sort(),
    installationId,
    issuedAt: now.toISOString(),
    notBefore: now.toISOString(),
    leaseExpiresAt: new Date(now.getTime() + leaseSeconds * 1_000).toISOString(),
    graceEndsAt: new Date(now.getTime() + (leaseSeconds + plan.graceSeconds) * 1_000).toISOString(),
    offline,
    usageLimits: plan.usageLimits,
  };
  return signReceipt(claims, signingKeys);
}

export async function getPublicVerificationKeys() {
  const keys = await signingKeys.publicKeys();
  if (hasDatabase()) {
    await Promise.all(keys.map((key) => getDb().insert(platformSigningKeys).values({
      id: key.id,
      publicKeyPem: key.publicKeyPem,
      privateKeyReference: "environment:PLATFORM_ED25519_PRIVATE_KEY_PEM",
      status: key.status,
    }).onConflictDoNothing()));
  }
  return keys.map(({ id, algorithm, publicKeyPem, status, createdAt, retiredAt }) => ({ id, algorithm, publicKeyPem, status, createdAt, retiredAt }));
}

export function generateLicenseKey() {
  const prefix = randomBytes(6).toString("hex");
  const key = `pl_${prefix}.${randomBytes(32).toString("base64url")}`;
  return { prefix, key, hash: hashSecret(key, "PLATFORM_LICENSE_KEY_PEPPER") };
}

export async function activateLicense(input: {
  licenseKey: string;
  application: ApplicationIdentity;
  pseudonymousDeviceId: string;
  idempotencyKey: string;
}) {
  assertDatabase();
  const prefix = /^pl_([a-f0-9]{12})\./.exec(input.licenseKey)?.[1];
  if (!prefix) throw new PlatformLicenseError("invalid_license_key", "License key is invalid", 401);
  const [candidate] = await getDb().select().from(platformLicenses).where(eq(platformLicenses.keyPrefix, prefix)).limit(1);
  if (!candidate?.keyHash || !safeEqual(hashSecret(input.licenseKey, "PLATFORM_LICENSE_KEY_PEPPER"), candidate.keyHash)) {
    throw new PlatformLicenseError("invalid_license_key", "License key is invalid", 401);
  }
  if (candidate.kind === "first_party") throw new PlatformLicenseError("invalid_license_key", "License key is invalid", 401);
  const { license, plan } = await resolveLicense(candidate.id);
  const identity = await resolveRegisteredIdentity(license.applicationId, input.application);
  const requestHash = createHash("sha256").update(canonicalJson(input)).digest("hex");
  const [prior] = await getDb().select().from(platformIdempotencyRecords).where(and(
    eq(platformIdempotencyRecords.scope, "activation"),
    eq(platformIdempotencyRecords.key, input.idempotencyKey),
  )).limit(1);
  if (prior) {
    if (prior.requestHash !== requestHash) throw new PlatformLicenseError("idempotency_conflict", "Idempotency key was reused with different input", 409);
    return prior.response as { installationId: string; receipt: SignedReceipt };
  }
  const deviceHash = hashSecret(input.pseudonymousDeviceId, "PLATFORM_INSTALLATION_PEPPER");
  const [existing] = await getDb().select().from(platformInstallations).where(and(
    eq(platformInstallations.licenseId, license.id),
    eq(platformInstallations.pseudonymousDeviceIdHash, deviceHash),
  )).limit(1);
  let installation = existing;
  if (installation?.deactivatedAt) throw new PlatformLicenseError("installation_deactivated", "This installation was deactivated", 403);
  if (!installation) {
    const [{ value: activeCount }] = await getDb().select({ value: count() }).from(platformInstallations).where(and(
      eq(platformInstallations.licenseId, license.id),
      isNull(platformInstallations.deactivatedAt),
    ));
    if (activeCount >= plan.deviceLimit) throw new PlatformLicenseError("device_limit", "Device limit reached", 409);
    [installation] = await getDb().insert(platformInstallations).values({
      licenseId: license.id,
      applicationIdentityId: identity.id,
      pseudonymousDeviceIdHash: deviceHash,
    }).returning();
    await getDb().insert(platformActivations).values({ licenseId: license.id, installationId: installation.id });
    await writeAudit("license-client", "installation.activated", "installation", installation.id, { licenseId: license.id });
  } else if (installation.applicationIdentityId !== identity.id) {
    throw new PlatformLicenseError("wrong_application", "Installation identity changed", 403);
  }
  const receipt = await issueReceipt(license, plan, exactIdentity(identity), installation.id, false);
  const response = { installationId: installation.id, receipt };
  await getDb().insert(platformIdempotencyRecords).values({
    scope: "activation",
    key: input.idempotencyKey,
    requestHash,
    response,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
  }).onConflictDoNothing();
  return response;
}

async function authorizeInstallationReceipt(installationId: string, receipt: SignedReceipt) {
  assertDatabase();
  const [row] = await getDb()
    .select({ installation: platformInstallations, identity: platformApplicationIdentities })
    .from(platformInstallations)
    .innerJoin(platformApplicationIdentities, eq(platformInstallations.applicationIdentityId, platformApplicationIdentities.id))
    .where(eq(platformInstallations.id, installationId))
    .limit(1);
  if (!row || row.installation.deactivatedAt) throw new PlatformLicenseError("installation_unavailable", "Installation is unavailable", 404);
  const { license, plan } = await resolveLicense(row.installation.licenseId);
  const identity = exactIdentity(row.identity);
  const validation = verifySignedReceipt(receipt, await signingKeys.publicKeys(), {
    issuer,
    audience,
    application: identity,
    productId: license.productId,
    knownRevokedLicenseIds: license.status === "revoked" ? new Set([license.id]) : new Set(),
    allowGrace: true,
  });
  if (!validation.ok || validation.claims.installationId !== installationId || validation.claims.licenseId !== license.id || validation.claims.licenseVersion !== license.version) {
    throw new PlatformLicenseError("invalid_installation_receipt", "Installation authorization is invalid or stale", 403);
  }
  return { row, license, plan, identity };
}

export async function refreshLease(installationId: string, offline: boolean, authorizationReceipt: SignedReceipt) {
  const { license, plan, identity } = await authorizeInstallationReceipt(installationId, authorizationReceipt);
  const receipt = await issueReceipt(license, plan, identity, installationId, offline);
  await getDb().update(platformInstallations).set({ lastSeenAt: new Date() }).where(eq(platformInstallations.id, installationId));
  if (offline) {
    const claims = JSON.parse(Buffer.from(receipt.payload, "base64url").toString("utf8")) as ReceiptClaims;
    await getDb().insert(platformOfflineLeases).values({
      licenseId: license.id,
      installationId,
      keyId: receipt.keyId,
      receiptHash: createHash("sha256").update(canonicalJson(receipt)).digest("hex"),
      expiresAt: new Date(claims.leaseExpiresAt),
      graceEndsAt: new Date(claims.graceEndsAt),
    });
    await writeAudit("license-client", "offline_lease.issued", "installation", installationId);
  }
  return { installationId, receipt };
}

export async function validateReceipt(receipt: SignedReceipt, application: ApplicationIdentity, productId: string) {
  assertDatabase();
  const [license] = await getDb().select().from(platformLicenses).where(eq(platformLicenses.id, receiptLicenseId(receipt))).limit(1);
  const revoked = new Set<string>();
  if (license?.status === "revoked") revoked.add(license.id);
  const validation = verifySignedReceipt(receipt, await signingKeys.publicKeys(), {
    issuer,
    audience,
    application,
    productId,
    knownRevokedLicenseIds: revoked,
    allowGrace: true,
  });
  if (validation.ok && (!license || license.status !== "active" || license.version !== validation.claims.licenseVersion)) {
    return { ok: false as const, code: "revoked" as const, message: "License state or version is no longer current" };
  }
  return validation;
}

function receiptLicenseId(receipt: SignedReceipt) {
  try {
    const payload = JSON.parse(Buffer.from(receipt.payload, "base64url").toString("utf8")) as { licenseId?: unknown };
    return typeof payload.licenseId === "string" ? payload.licenseId : "00000000-0000-0000-0000-000000000000";
  } catch {
    return "00000000-0000-0000-0000-000000000000";
  }
}

export async function deactivateInstallation(installationId: string, authorizationReceipt: SignedReceipt) {
  assertDatabase();
  await authorizeInstallationReceipt(installationId, authorizationReceipt);
  const [updated] = await getDb().update(platformInstallations).set({ deactivatedAt: new Date() }).where(and(
    eq(platformInstallations.id, installationId),
    isNull(platformInstallations.deactivatedAt),
  )).returning();
  if (!updated) return false;
  await getDb().update(platformActivations).set({ status: "deactivated" }).where(and(
    eq(platformActivations.installationId, installationId),
    eq(platformActivations.status, "active"),
  ));
  await writeAudit("license-client", "installation.deactivated", "installation", installationId);
  return true;
}

export async function recordLicenseVersion(license: typeof platformLicenses.$inferSelect, actor: string) {
  await getDb().insert(platformLicenseVersions).values({
    licenseId: license.id,
    version: license.version,
    snapshot: { ...license, keyHash: license.keyHash ? "[redacted]" : null },
    createdBy: actor,
  });
}
