import { NextResponse } from "next/server";
import { getPublicLiveEvents } from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Math.min(
    Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 24) || 24, 1),
    100,
  );
  try {
    const events = await getPublicLiveEvents(limit);
    return NextResponse.json(
      { data: events, meta: { apiVersion: "1", refreshAfterSeconds: 15 } },
      {
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=25",
        },
      },
    );
  } catch (error) {
    console.error("Public live coverage lookup failed", error);
    return NextResponse.json(
      { error: { code: "live_coverage_unavailable", message: "Live coverage is temporarily unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
