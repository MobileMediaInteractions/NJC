import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { developerScopes } from "@harborline/contracts";
import { getDb, hasDatabase } from "@/db";
import { apiKeys } from "@/db/schema";
import { getAccountIdentity } from "@/lib/auth";
import { createApiKeySecret, writeApiAudit } from "@/lib/api-keys";

const inputSchema = z.object({
  name: z.string().trim().min(3).max(80),
  scopes: z.array(z.enum(developerScopes)).min(1).max(developerScopes.length),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

export async function GET() {
  const identity = await getAccountIdentity();
  if (!identity) return NextResponse.json({ error: { code: "unauthorized", message: "A verified account is required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Postgres before creating API keys" } }, { status: 503 });
  const data = await getDb().select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, scopes: apiKeys.scopes, rateLimitMinute: apiKeys.rateLimitMinute, rateLimitDay: apiKeys.rateLimitDay, lastUsedAt: apiKeys.lastUsedAt, expiresAt: apiKeys.expiresAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.ownerClerkId, identity.clerkId)).orderBy(desc(apiKeys.createdAt));
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const identity = await getAccountIdentity();
  if (!identity) return NextResponse.json({ error: { code: "unauthorized", message: "A verified account is required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Postgres before creating API keys" } }, { status: 503 });
  if (!process.env.API_KEY_PEPPER) return NextResponse.json({ error: { code: "service_not_configured", message: "API key hashing is not configured" } }, { status: 503 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the key name, scopes and expiration", details: parsed.error.flatten() } }, { status: 400 });
  const [count] = await getDb().select({ value: sql<number>`count(*)::int` }).from(apiKeys).where(and(eq(apiKeys.ownerClerkId, identity.clerkId), isNull(apiKeys.revokedAt)));
  if ((count?.value ?? 0) >= 5) return NextResponse.json({ error: { code: "key_limit_reached", message: "Revoke an active key before creating another (maximum 5)" } }, { status: 409 });
  const generated = createApiKeySecret();
  const expiresAt = parsed.data.expiresInDays ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000) : null;
  const [record] = await getDb().insert(apiKeys).values({ ownerClerkId: identity.clerkId, ownerEmail: identity.email, name: parsed.data.name, prefix: generated.prefix, keyHash: generated.keyHash, scopes: parsed.data.scopes, expiresAt }).returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, scopes: apiKeys.scopes, rateLimitMinute: apiKeys.rateLimitMinute, rateLimitDay: apiKeys.rateLimitDay, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt });
  await writeApiAudit({ apiKeyId: record.id, actorClerkId: identity.clerkId, event: "key.created", request, metadata: { scopes: record.scopes } });
  return NextResponse.json({ data: { ...record, key: generated.rawKey }, meta: { apiVersion: "1", secretShownOnce: true } }, { status: 201 });
}
