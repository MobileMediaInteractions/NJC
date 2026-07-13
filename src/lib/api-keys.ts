import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { DeveloperScope } from "@harborline/contracts";
import { getDb, hasDatabase } from "@/db";
import { apiAuditLogs, apiKeys } from "@/db/schema";

const keyMarker = "hln_live";

function pepper() {
  const value = process.env.API_KEY_PEPPER;
  if (!value) throw new Error("API_KEY_PEPPER is not configured");
  return value;
}

export function hashApiKey(value: string) {
  return createHmac("sha256", pepper()).update(value).digest("hex");
}

export function createApiKeySecret() {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const rawKey = `${keyMarker}_${prefix}_${secret}`;
  return { prefix, rawKey, keyHash: hashApiKey(rawKey) };
}

export function extractPrefix(value: string) {
  const match = /^hln_live_([a-f0-9]{12})_[A-Za-z0-9_-]{40,}$/.exec(value);
  return match?.[1] ?? null;
}

function safeHashEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex"); const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyApiKey(rawKey: string, scope: DeveloperScope) {
  if (!hasDatabase()) return { ok: false as const, status: 503, code: "service_not_configured", message: "Developer API storage is not configured" };
  const prefix = extractPrefix(rawKey);
  if (!prefix) return { ok: false as const, status: 401, code: "invalid_api_key", message: "API key is invalid" };
  const [record] = await getDb().select().from(apiKeys).where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt))).limit(1);
  if (!record || (record.expiresAt && record.expiresAt <= new Date()) || !safeHashEqual(hashApiKey(rawKey), record.keyHash)) {
    return { ok: false as const, status: 401, code: "invalid_api_key", message: "API key is invalid or expired" };
  }
  if (!record.scopes.includes(scope)) return { ok: false as const, status: 403, code: "insufficient_scope", message: `This endpoint requires ${scope}` };
  return { ok: true as const, key: record };
}

export async function writeApiAudit(input: {
  apiKeyId?: string; actorClerkId?: string; event: string; request?: Request; metadata?: Record<string, unknown>;
}) {
  if (!hasDatabase()) return;
  try {
    await getDb().insert(apiAuditLogs).values({
      apiKeyId: input.apiKeyId, actorClerkId: input.actorClerkId, event: input.event,
      ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: input.request?.headers.get("user-agent"), metadata: input.metadata ?? {},
    });
  } catch (error) { console.error("API audit write failed", error); }
}
