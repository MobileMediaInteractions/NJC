import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeReaderApiRequest, evaluateReaderApiAccess } from "@/lib/reader-api-access";
import { recordPageView } from "@/lib/traffic-analytics";

const input = z.object({
  pathname: z.string().min(1).max(500),
});

const botPattern = /bot|crawler|spider|slurp|preview|facebookexternalhit|discordbot|twitterbot|linkedinbot/i;

export async function POST(request: Request) {
  const startedAt = Date.now();
  const access = evaluateReaderApiAccess(request);
  if (!access.allowed || access.source !== "web") {
    return NextResponse.json({ error: { code: "forbidden", message: "Page views must come from the Courier website." } }, { status: 403 });
  }
  const authorization = await authorizeReaderApiRequest(request);
  if (authorization.response) return authorization.response;
  if (botPattern.test(request.headers.get("user-agent") ?? "")) {
    return NextResponse.json({ data: { recorded: false }, meta: { apiVersion: "1", reason: "automated_client" } }, { status: 202, headers: authorization.headers });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_request", message: "A valid page view is required." } }, { status: 400, headers: authorization.headers });
  }

  try {
    const result = await recordPageView(parsed.data.pathname);
    console.log(JSON.stringify({
      level: "info",
      message: "Page view processed",
      route: "/api/v1/analytics/page-view",
      requestId: request.headers.get("x-vercel-id"),
      recorded: result.recorded,
      pathname: result.recorded ? result.pathname : undefined,
      duration_ms: Date.now() - startedAt,
    }));
    return NextResponse.json({ data: result, meta: { apiVersion: "1" } }, { status: 202, headers: authorization.headers });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "Page view failed",
      route: "/api/v1/analytics/page-view",
      requestId: request.headers.get("x-vercel-id"),
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startedAt,
    }));
    return NextResponse.json({ error: { code: "analytics_unavailable", message: "The page view could not be recorded." } }, { status: 503, headers: authorization.headers });
  }
}
