import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { createRedisClient } from "@/lib/redis";

export const officialReaderOrigins = [
  "https://www.thejerseycourier.com",
  "https://thejerseycourier.com",
  "https://njc-web.vercel.app",
] as const;

export const officialReaderClients = ["mobile", "tvos", "androidtv", "roku"] as const;

type ReaderSource = "web" | (typeof officialReaderClients)[number];
type ReaderAccess = { allowed: true; source: ReaderSource; origin: string | null } | { allowed: false };

let limiter: Ratelimit | null = null;
const localLimits = new Map<string, { count: number; reset: number }>();

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedOrigins() {
  const configured = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .map((value) => value && !/^https?:\/\//i.test(value) ? `https://${value}` : value)
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));
  return new Set<string>([...officialReaderOrigins, ...configured]);
}

function isDevelopmentTarget(origin: string, allowLocalDevelopment: boolean) {
  if (!allowLocalDevelopment) return false;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function evaluateReaderApiAccess(request: Request, options?: { allowLocalDevelopment?: boolean }): ReaderAccess {
  const targetOrigin = new URL(request.url).origin;
  const origins = allowedOrigins();
  const allowLocalDevelopment = options?.allowLocalDevelopment ?? process.env.NODE_ENV !== "production";
  if (!origins.has(targetOrigin) && !isDevelopmentTarget(targetOrigin, allowLocalDevelopment)) return { allowed: false };

  const client = request.headers.get("x-njc-client")?.toLowerCase();
  if (officialReaderClients.includes(client as (typeof officialReaderClients)[number])) {
    return { allowed: true, source: client as ReaderSource, origin: null };
  }
  if (/^NJCourier-Roku\/[0-9A-Za-z._-]+$/.test(request.headers.get("user-agent") ?? "")) {
    return { allowed: true, source: "roku", origin: null };
  }

  const headerOrigin = normalizeOrigin(request.headers.get("origin"));
  const referrerOrigin = normalizeOrigin(request.headers.get("referer"));
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (headerOrigin && origins.has(headerOrigin)) return { allowed: true, source: "web", origin: headerOrigin };
  if (referrerOrigin && origins.has(referrerOrigin)) return { allowed: true, source: "web", origin: referrerOrigin };
  if (fetchSite === "same-origin" && (origins.has(targetOrigin) || isDevelopmentTarget(targetOrigin, allowLocalDevelopment))) return { allowed: true, source: "web", origin: targetOrigin };
  return { allowed: false };
}

function rateLimitIdentifier(request: Request, source: ReaderSource) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(`${source}:${address}`).digest("hex");
}

function responseHeaders(origin: string | null) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Vary": "Origin, Referer, Sec-Fetch-Site, X-NJC-Client",
    "X-Robots-Tag": "noindex, nofollow",
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export async function authorizeReaderApiRequest(request: Request) {
  const access = evaluateReaderApiAccess(request);
  if (!access.allowed) {
    return {
      response: NextResponse.json(
        { error: { code: "reader_api_restricted", message: "This reader endpoint is reserved for The New Jersey Courier website and official apps. Developers must use /api/developer/v1/stories with an API key." } },
        { status: 403, headers: responseHeaders(null) },
      ),
    };
  }

  const identifier = rateLimitIdentifier(request, access.source);
  const redis = createRedisClient();
  if (redis) {
    limiter ??= new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(600, "1 m"), prefix: "njc:reader-api" });
    const result = await limiter.limit(identifier);
    const headers = responseHeaders(access.origin);
    headers.set("X-RateLimit-Limit", String(result.limit));
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    if (!result.success) {
      headers.set("Retry-After", String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000))));
      return { response: NextResponse.json({ error: { code: "rate_limit_exceeded", message: "Reader API rate limit exceeded" } }, { status: 429, headers }) };
    }
    return { headers };
  }

  const now = Date.now();
  if (localLimits.size > 10_000) {
    for (const [key, value] of localLimits) if (value.reset <= now) localLimits.delete(key);
    if (localLimits.size > 10_000) localLimits.clear();
  }
  const previous = localLimits.get(identifier);
  const current = !previous || previous.reset <= now ? { count: 0, reset: now + 60_000 } : previous;
  current.count += 1;
  localLimits.set(identifier, current);
  const headers = responseHeaders(access.origin);
  headers.set("X-RateLimit-Limit", "600");
  headers.set("X-RateLimit-Remaining", String(Math.max(0, 600 - current.count)));
  if (current.count > 600) return { response: NextResponse.json({ error: { code: "rate_limit_exceeded", message: "Reader API rate limit exceeded" } }, { status: 429, headers }) };
  return { headers };
}
