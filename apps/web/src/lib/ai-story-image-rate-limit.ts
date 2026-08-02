import { Ratelimit } from "@upstash/ratelimit";
import { createRedisClient } from "@/lib/redis";

const maxRequests = 8;
const windowMs = 60 * 60 * 1_000;
const localWindows = new Map<string, { count: number; reset: number }>();
let limiter: Ratelimit | null = null;

function localLimit(identifier: string) {
  const now = Date.now();
  const existing = localWindows.get(identifier);
  const current = !existing || existing.reset <= now
    ? { count: 0, reset: now + windowMs }
    : existing;
  current.count += 1;
  localWindows.set(identifier, current);
  return {
    success: current.count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    reset: current.reset,
  };
}

export async function limitAiStoryImage(identifier: string) {
  const redis = createRedisClient();
  if (!redis) return localLimit(identifier);
  limiter ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, "1 h"),
    analytics: true,
    prefix: "njcourier:studio:ai-story-image",
  });
  try {
    return await limiter.limit(identifier);
  } catch (error) {
    console.error("AI image rate limit failed; using instance-local limit", error);
    return localLimit(identifier);
  }
}
