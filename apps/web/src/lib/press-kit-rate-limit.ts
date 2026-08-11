import { Ratelimit } from "@upstash/ratelimit";
import { createRedisClient } from "@/lib/redis";

const maxRequests = 3;
const windowMs = 60 * 60 * 1_000;
const localWindows = new Map<string, { count: number; reset: number }>();
let limiter: Ratelimit | null = null;
const portalLimiters = new Map<string, Ratelimit>();

function getLimiter() {
  const redis = createRedisClient();
  if (!redis) return null;
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, "1 h"),
      analytics: true,
      prefix: "njcourier:press-kit",
    });
  }
  return limiter;
}

function localLimit(identifier: string) {
  const now = Date.now();
  pruneLocalWindows(now);
  const existing = localWindows.get(identifier);
  const current = !existing || existing.reset <= now ? { count: 0, reset: now + windowMs } : existing;
  current.count += 1;
  localWindows.set(identifier, current);
  return { success: current.count <= maxRequests, limit: maxRequests, remaining: Math.max(0, maxRequests - current.count), reset: current.reset, durable: false };
}

function pruneLocalWindows(now: number) {
  if (localWindows.size < 5_000) return;
  for (const [key, value] of localWindows) {
    if (value.reset <= now) localWindows.delete(key);
  }
  if (localWindows.size < 5_000) return;
  for (const key of localWindows.keys()) {
    localWindows.delete(key);
    if (localWindows.size < 4_000) break;
  }
}

export async function limitPressKitRequest(identifier: string) {
  const configured = getLimiter();
  if (!configured) return localLimit(identifier);
  try {
    const result = await configured.limit(identifier);
    return { ...result, durable: true };
  } catch (error) {
    console.error("Press-kit Redis rate limit failed; using instance-local fallback", error);
    return localLimit(identifier);
  }
}

const portalPolicies = {
  create: { requests: 5, window: "1 h" as const, windowMs: 60 * 60 * 1_000 },
  message: { requests: 30, window: "1 h" as const, windowMs: 60 * 60 * 1_000 },
  submit: { requests: 10, window: "1 h" as const, windowMs: 60 * 60 * 1_000 },
  download: { requests: 20, window: "1 h" as const, windowMs: 60 * 60 * 1_000 },
} as const;

export async function limitPressPortalRequest(
  bucket: keyof typeof portalPolicies,
  identifier: string,
) {
  const policy = portalPolicies[bucket];
  const redis = createRedisClient();
  if (redis) {
    let configured = portalLimiters.get(bucket);
    if (!configured) {
      configured = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(policy.requests, policy.window),
        analytics: true,
        prefix: `njcourier:press-portal:${bucket}`,
      });
      portalLimiters.set(bucket, configured);
    }
    try {
      const result = await configured.limit(identifier);
      return { ...result, durable: true };
    } catch (error) {
      console.error("Press portal Redis rate limit failed; using instance-local fallback", {
        bucket,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
  const key = `portal:${bucket}:${identifier}`;
  const now = Date.now();
  pruneLocalWindows(now);
  const existing = localWindows.get(key);
  const current = !existing || existing.reset <= now
    ? { count: 0, reset: now + policy.windowMs }
    : existing;
  current.count += 1;
  localWindows.set(key, current);
  return {
    success: current.count <= policy.requests,
    limit: policy.requests,
    remaining: Math.max(0, policy.requests - current.count),
    reset: current.reset,
    durable: false,
  };
}
