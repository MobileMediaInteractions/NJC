import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { createRedisClient } from "@/lib/redis";

const maxRequests = 5;
const localWindows = new Map<string, { count: number; reset: number }>();
let limiter: Ratelimit | null = null;

function identifier(request: Request) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(address).digest("hex");
}

export async function limitTwentyUnderTwentyIntake(request: Request) {
  const id = identifier(request);
  const redis = createRedisClient();
  if (redis) {
    limiter ??= new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, "1 h"),
      analytics: true,
      prefix: "njcourier:20-under-20",
    });
    return limiter.limit(id);
  }

  const now = Date.now();
  const current = localWindows.get(id);
  const window =
    !current || current.reset <= now
      ? { count: 0, reset: now + 60 * 60 * 1_000 }
      : current;
  window.count += 1;
  localWindows.set(id, window);
  return {
    success: window.count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - window.count),
    reset: window.reset,
  };
}
