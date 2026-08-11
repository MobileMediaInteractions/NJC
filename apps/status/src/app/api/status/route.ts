import { NextResponse } from "next/server";
import { buildStatusPayload } from "@/lib/status-monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await buildStatusPayload();
    return NextResponse.json(payload, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: { code: "status_unavailable", message: "The status snapshot could not be generated" } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
