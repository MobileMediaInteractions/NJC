import { NextResponse } from "next/server";
import { getPublicLiveEvent } from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const afterValue = new URL(request.url).searchParams.get("after");
  const after = afterValue ? new Date(afterValue) : undefined;
  if (after && Number.isNaN(after.getTime())) {
    return NextResponse.json(
      { error: { code: "invalid_cursor", message: "The live update cursor is invalid" } },
      { status: 400 },
    );
  }
  try {
    const event = await getPublicLiveEvent(slug, { after });
    if (!event) {
      return NextResponse.json(
        { error: { code: "not_found", message: "This live desk is not available" } },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        data: event,
        meta: {
          apiVersion: "1",
          refreshAfterSeconds: event.status === "live" || event.status === "paused" ? 8 : 30,
          cursor: event.updatedAt,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3, stale-while-revalidate=12",
        },
      },
    );
  } catch (error) {
    console.error("Public live desk lookup failed", { slug, error });
    return NextResponse.json(
      { error: { code: "live_coverage_unavailable", message: "Live coverage is temporarily unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
