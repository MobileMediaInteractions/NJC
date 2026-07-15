import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type Bucket = "activate" | "lease" | "validate";
const definitions: Record<Bucket, { max: number; interval: "1 m" }> = {
  activate: { max: 20, interval: "1 m" },
  lease: { max: 60, interval: "1 m" },
  validate: { max: 120, interval: "1 m" },
};
const limiters = new Map<Bucket, Ratelimit>();
const local = new Map<string, { count: number; reset: number }>();

function clientId(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(address).digest("hex");
}
export async function enforcePlatformRateLimit(request: Request, bucket: Bucket) {
  const definition = definitions[bucket];
  const id = clientId(request);
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    let limiter = limiters.get(bucket);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(definition.max, definition.interval),
        prefix: `platform:license:${bucket}`,
      });
      limiters.set(bucket, limiter);
    }
    const result = await limiter.limit(id);
    if (!result.success) return NextResponse.json(
      { error: { code: "rate_limit_exceeded", message: "Rate limit exceeded" } },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000))) } },
    );
    return null;
  }
  if (process.env.NODE_ENV === "production") return NextResponse.json(
    { error: { code: "rate_limiter_not_configured", message: "Licensing rate limiting is unavailable" } },
    { status: 503 },
  );
  const key = `${bucket}:${id}`;
  const now = Date.now();
  const state = local.get(key);
  const current = !state || state.reset <= now ? { count: 0, reset: now + 60_000 } : state;
  current.count += 1;
  local.set(key, current);
  return current.count > definition.max
    ? NextResponse.json({ error: { code: "rate_limit_exceeded", message: "Development rate limit exceeded" } }, { status: 429 })
    : null;
}
