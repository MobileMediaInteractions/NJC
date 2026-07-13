import { NextResponse } from "next/server";
import { getAudienceSummary } from "@/lib/audience";
import { getStudioUser } from "@/lib/auth";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const data = await getAudienceSummary();
  console.log(JSON.stringify({ level: "info", message: "Studio audience summary read", requestId: request.headers.get("x-vercel-id"), actor: viewer.id, duration_ms: Date.now() - startedAt }));
  return NextResponse.json({ data, meta: { apiVersion: "1" } }, { headers: { "Cache-Control": "private, no-store" } });
}
