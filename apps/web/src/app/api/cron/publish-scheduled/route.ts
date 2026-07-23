import { and, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { refreshAnalyticsArchives } from "@/lib/traffic-analytics";

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const now = new Date();
  const published = await getDb().update(stories).set({ status: "published", publishedAt: now, updatedAt: now }).where(and(eq(stories.status, "scheduled"), lte(stories.scheduledAt, now))).returning({ id: stories.id, slug: stories.slug });
  const archives = await refreshAnalyticsArchives(now);
  console.log(JSON.stringify({
    level: "info",
    message: "Daily newsroom maintenance completed",
    route: "/api/cron/publish-scheduled",
    requestId: request.headers.get("x-vercel-id"),
    published: published.length,
    analyticsArchivesCreated: archives.created,
    duration_ms: Date.now() - startedAt,
  }));
  return NextResponse.json({ ok: true, published: published.length, stories: published, analyticsArchives: archives.created });
}
