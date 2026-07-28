import { and, eq, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent } from "@harborline/backend/schema";
import { expireAccessCredits } from "@/lib/access-credits";
import { refreshAnalyticsArchives } from "@/lib/traffic-analytics";
import { publishDueStories } from "@/lib/scheduled-publication";

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const now = new Date();
  const published = await publishDueStories(now);
  const premiumPublished = await getDb().update(premiumContent).set({ status: "published", publishedAt: now, updatedAt: now }).where(and(eq(premiumContent.status, "scheduled"), lte(premiumContent.scheduledAt, now))).returning({ id: premiumContent.id, slug: premiumContent.slug });
  const [archives, creditExpirations] = await Promise.all([
    refreshAnalyticsArchives(now),
    expireAccessCredits(now),
  ]);
  if (published.length) {
    revalidatePath("/");
    revalidatePath("/latest");
    revalidatePath("/api/v1/stories");
    revalidatePath("/feed.xml");
    revalidatePath("/sitemap.xml");
    revalidatePath("/news-sitemap.xml");
    for (const story of published) {
      revalidatePath(`/story/${story.slug}`);
      revalidatePath(`/category/${story.categorySlug}`);
    }
  }
  console.log(JSON.stringify({
    level: "info",
    message: "Daily newsroom maintenance completed",
    route: "/api/cron/publish-scheduled",
    requestId: request.headers.get("x-vercel-id"),
    published: published.length,
    premiumPublished: premiumPublished.length,
    accessCreditExpirations: creditExpirations.created,
    analyticsArchivesCreated: archives.created,
    duration_ms: Date.now() - startedAt,
  }));
  return NextResponse.json({ ok: true, published: published.length, stories: published, premiumPublished: premiumPublished.length, premiumContent: premiumPublished, accessCreditExpirations: creditExpirations.created, analyticsArchives: archives.created });
}
