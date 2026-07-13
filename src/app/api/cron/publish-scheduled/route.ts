import { and, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/db";
import { stories } from "@/db/schema";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const now = new Date();
  const published = await getDb().update(stories).set({ status: "published", publishedAt: now, updatedAt: now }).where(and(eq(stories.status, "scheduled"), lte(stories.scheduledAt, now))).returning({ id: stories.id, slug: stories.slug });
  return NextResponse.json({ ok: true, published: published.length, stories: published });
}
