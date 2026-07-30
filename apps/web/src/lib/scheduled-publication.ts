import { and, eq, lte } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { getSiteConfiguration } from "@/lib/site-settings";

/**
 * Vercel Hobby only runs the maintenance cron once daily. Public news surfaces
 * call this before reading so a due story becomes available on the first
 * request after its scheduled time, while the daily cron remains the fallback.
 *
 * The conditional status predicate makes concurrent requests idempotent.
 */
export async function publishDueStories(now = new Date()) {
  if (!hasDatabase()) return [];
  if (!(await getSiteConfiguration()).studio.automations.scheduledPublishing) {
    return [];
  }

  return getDb()
    .update(stories)
    .set({
      status: "published",
      publishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(stories.status, "scheduled"),
        lte(stories.scheduledAt, now),
      ),
    )
    .returning({
      id: stories.id,
      slug: stories.slug,
      categorySlug: stories.categorySlug,
    });
}
