import { Ratelimit } from "@upstash/ratelimit";
import { createRedisClient } from "@/lib/redis";

const maxRequests = 3;
const windowMs = 60 * 60 * 1_000;
const localWindows = new Map<string, { count: number; reset: number }>();
let limiter: Ratelimit | null = null;

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
  const existing = localWindows.get(identifier);
  const current = !existing || existing.reset <= now ? { count: 0, reset: now + windowMs } : existing;
  current.count += 1;
  localWindows.set(identifier, current);
  return { success: current.count <= maxRequests, limit: maxRequests, remaining: Math.max(0, maxRequests - current.count), reset: current.reset, durable: false };
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
