import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/db";
import { alerts, pushDevices, stories } from "@/db/schema";
import { getAudienceSummary } from "@/lib/audience";
import { canUseMobileAdmin } from "@/lib/auth";

export async function GET() {
  const viewer = await canUseMobileAdmin();
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Editor authorization required" } }, { status: 403 });
  const audience = await getAudienceSummary();
  if (!hasDatabase()) return NextResponse.json({ data: { review: 0, scheduled: 0, publishedToday: 0, activeAlerts: 0, pushDevices: 0, audience, database: "not configured" }, meta: { apiVersion: "1" } });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const db = getDb();
  const [[review], [scheduled], [published], [activeAlerts], [devices]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(stories).where(eq(stories.status, "review")),
    db.select({ count: sql<number>`count(*)::int` }).from(stories).where(eq(stories.status, "scheduled")),
    db.select({ count: sql<number>`count(*)::int` }).from(stories).where(and(eq(stories.status, "published"), gte(stories.publishedAt, start))),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(eq(alerts.isActive, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(pushDevices).where(eq(pushDevices.isActive, true)),
  ]);
  return NextResponse.json({ data: { review: review.count, scheduled: scheduled.count, publishedToday: published.count, activeAlerts: activeAlerts.count, pushDevices: devices.count, audience, database: "connected" }, meta: { apiVersion: "1" } });
}
