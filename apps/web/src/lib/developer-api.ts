import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { DeveloperScope } from "@harborline/contracts";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@harborline/backend/db";
import { apiKeys } from "@harborline/backend/schema";
import { verifyApiKey, writeApiAudit } from "@/lib/api-keys";

let limiters: { minute: Ratelimit; day: Ratelimit } | null = null;
function getLimiters() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!limiters) {
    const redis = Redis.fromEnv();
    limiters = {
      minute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), analytics: true, prefix: "harborline:api:minute" }),
      day: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(10000, "1 d"), analytics: true, prefix: "harborline:api:day" }),
    };
  }
  return limiters;
}

export async function authorizeDeveloperRequest(request: Request, scope: DeveloperScope) {
  const rawKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!rawKey) return { response: NextResponse.json({ error: { code: "missing_api_key", message: "Send an API key in X-API-Key or Bearer authorization" } }, { status: 401 }) };
  let verified;
  try { verified = await verifyApiKey(rawKey, scope); }
  catch (error) { console.error(error); return { response: NextResponse.json({ error: { code: "service_not_configured", message: "Developer API key verification is unavailable" } }, { status: 503 }) }; }
  if (!verified.ok) return { response: NextResponse.json({ error: { code: verified.code, message: verified.message } }, { status: verified.status }) };
  const configured = getLimiters();
  if (!configured) return { response: NextResponse.json({ error: { code: "rate_limiter_not_configured", message: "Developer API rate limiting is not configured" } }, { status: 503 }) };
  const identifier = verified.key.id;
  const [minute, day] = await Promise.all([configured.minute.limit(identifier), configured.day.limit(identifier)]);
  const headers = new Headers({
    "X-RateLimit-Limit-Minute": String(minute.limit), "X-RateLimit-Remaining-Minute": String(minute.remaining),
    "X-RateLimit-Limit-Day": String(day.limit), "X-RateLimit-Remaining-Day": String(day.remaining),
  });
  if (!minute.success || !day.success) {
    const reset = Math.max(minute.reset, day.reset); headers.set("Retry-After", String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))));
    await writeApiAudit({ apiKeyId: verified.key.id, event: "request.rate_limited", request, metadata: { scope } });
    return { response: NextResponse.json({ error: { code: "rate_limit_exceeded", message: "API rate limit exceeded" } }, { status: 429, headers }) };
  }
  await Promise.all([
    getDb().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, verified.key.id)),
    writeApiAudit({ apiKeyId: verified.key.id, event: "request.authorized", request, metadata: { scope, path: new URL(request.url).pathname } }),
  ]);
  return { key: verified.key, headers };
}
