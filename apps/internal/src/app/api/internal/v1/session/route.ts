import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalViewer } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getInternalViewer(await headers());
  if (!viewer) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ data: viewer, meta: { apiVersion: "1" } }, { headers: { "Cache-Control": "private, no-store" } });
}
