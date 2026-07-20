import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, gte, isNull, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { apiAuditLogs, deviceSessions } from "@harborline/backend/schema";

const codeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeDevicePayload(
  value: unknown,
  expectedKeys: readonly string[],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...input };

  for (const key of expectedKeys) {
    if (normalized[key] !== undefined) continue;
    const snakeCase = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    const alias = [key.toLowerCase(), snakeCase].find(
      (candidate) => input[candidate] !== undefined,
    );
    if (alias) normalized[key] = input[alias];
  }

  return normalized;
}

function pairingPepper() {
  const value = process.env.DEVICE_PAIRING_PEPPER;
  if (!value) throw new Error("DEVICE_PAIRING_PEPPER is not configured");
  return value;
}

export function isDevicePairingConfigured() {
  return hasDatabase() && Boolean(process.env.DEVICE_PAIRING_PEPPER);
}

export function pairingHash(value: string) {
  return createHmac("sha256", pairingPepper()).update(value).digest("hex");
}

export function safePairingHashEqual(value: string, expectedHash: string) {
  const actual = Buffer.from(pairingHash(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeUserCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatUserCode(value: string) {
  const normalized = normalizeUserCode(value).slice(0, 6);
  return normalized.length > 3
    ? `${normalized.slice(0, 3)}-${normalized.slice(3)}`
    : normalized;
}

export function createPairingCredentials() {
  let userCode = "";
  const bytes = randomBytes(6);
  for (const byte of bytes)
    userCode += codeAlphabet[byte % codeAlphabet.length];
  const deviceSecret = `hln_pair_${randomBytes(32).toString("base64url")}`;
  return {
    deviceSecret,
    deviceSecretHash: pairingHash(deviceSecret),
    userCode: formatUserCode(userCode),
    userCodeHash: pairingHash(userCode),
  };
}

export function createDeviceAccessToken() {
  const rawToken = `hln_device_${randomBytes(40).toString("base64url")}`;
  return { rawToken, tokenHash: pairingHash(rawToken) };
}

export function requesterAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function pairingApprovalAllowed(actorClerkId: string) {
  const [recent] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(apiAuditLogs)
    .where(
      and(
        eq(apiAuditLogs.actorClerkId, actorClerkId),
        eq(apiAuditLogs.event, "device_pairing.approval_attempt"),
        gte(apiAuditLogs.createdAt, new Date(Date.now() - 10 * 60_000)),
      ),
    );
  return (recent?.count ?? 0) < 10;
}

export async function recordPairingApprovalAttempt(
  actorClerkId: string,
  request: Request,
  matched: boolean,
) {
  await getDb()
    .insert(apiAuditLogs)
    .values({
      actorClerkId,
      event: "device_pairing.approval_attempt",
      ipAddress: requesterAddress(request),
      userAgent: request.headers.get("user-agent"),
      metadata: { matched },
    });
}

export async function authenticateDeviceRequest(request: Request) {
  if (!isDevicePairingConfigured()) return null;
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token?.startsWith("hln_device_")) return null;
  const [session] = await getDb()
    .select()
    .from(deviceSessions)
    .where(
      and(
        eq(deviceSessions.tokenHash, pairingHash(token)),
        isNull(deviceSessions.revokedAt),
        gt(deviceSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!session) return null;
  await getDb()
    .update(deviceSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(deviceSessions.id, session.id));
  return session;
}
