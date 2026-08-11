import { NextResponse } from "next/server";
import { collectLiveChecks, deriveOverall } from "@/lib/status-monitor";
import { isStatusHistoryConfigured, recordStatusSnapshot } from "@/lib/status-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isStatusHistoryConfigured()) {
    return NextResponse.json({ error: { code: "history_not_configured", message: "Historical status collection is not configured" } }, { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const checks = await collectLiveChecks();
  const storage = await recordStatusSnapshot(checks);
  const counts = { operational: 0, degraded: 0, outage: 0, protected: 0, unknown: 0 };
  for (const check of checks) counts[check.state] += 1;
  return NextResponse.json({
    accepted: storage.stored,
    reason: storage.reason,
    generatedAt: new Date().toISOString(),
    overall: deriveOverall(checks.map((check) => check.state)),
    counts,
  }, {
    status: 200,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
