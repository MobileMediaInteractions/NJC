import { NextResponse } from "next/server";
import { getStudioUser } from "@/lib/auth";
import { runAnalyticsProductionAudit } from "@/lib/analytics-production-audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor"].includes(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Production reconciliation requires an administrator or editor." } }, { status: 403 });
  }
  try {
    return NextResponse.json(await runAnalyticsProductionAudit(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Analytics production audit failed", error);
    return NextResponse.json({ error: { code: "audit_failed", message: "Production evidence could not be reconciled." } }, { status: 503 });
  }
}
