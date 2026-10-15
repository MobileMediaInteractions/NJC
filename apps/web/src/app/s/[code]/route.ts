import { and, eq, isNull, lte, or } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { getSiteOrigin } from "@/lib/origin";
import { createStoryShortLinkHandler } from "@/lib/story-short-link-handler";

export const dynamic = "force-dynamic";

export const GET = createStoryShortLinkHandler({
  siteOrigin: getSiteOrigin,
  async findPublishedStory(id) {
    if (!hasDatabase()) throw new Error("Story short-link database is unavailable");
    const [story] = await getDb()
      .select({ slug: stories.slug, updatedAt: stories.updatedAt })
      .from(stories)
      .where(and(
        eq(stories.id, id),
        eq(stories.status, "published"),
        or(isNull(stories.publishedAt), lte(stories.publishedAt, new Date())),
      ))
      .limit(1);
    return story ?? null;
  },
  onError() { console.error("Published story short-link lookup failed"); },
});

export const HEAD = GET;
