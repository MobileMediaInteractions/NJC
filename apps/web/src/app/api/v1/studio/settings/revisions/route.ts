import { NextResponse } from "next/server";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfigurationHistory } from "@/lib/site-settings";

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const rows = await getSiteConfigurationHistory();
  return NextResponse.json({ data: rows.map((row) => ({ revision: row.revision, reason: row.reason, environment: row.environment, affectedPlatforms: row.affectedPlatforms, changedByClerkId: row.changedByClerkId, rolledBackFromRevision: row.rolledBackFromRevision, createdAt: row.createdAt.toISOString() })), meta: { apiVersion: "1" } });
}
