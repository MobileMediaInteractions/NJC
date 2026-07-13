import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { stories } from "@/db/schema";
import { seedStories } from "@/lib/seed";
import type { Story } from "@/lib/types";

function normalizeStory(row: typeof stories.$inferSelect): Story {
  const fallbackAuthor = {
    id: "harborline-desk",
    name: "Harborline Newsroom",
    role: "Local news desk",
    initials: "HL",
  };

  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    dek: row.dek,
    body: row.body,
    category: row.categorySlug,
    categoryLabel: row.categoryLabel,
    location: row.location,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    readingMinutes: row.readingMinutes,
    image: row.imageUrl ?? seedStories[0].image,
    imageAlt: row.imageAlt ?? "Harbor County news",
    author: row.authorSnapshot ?? fallbackAuthor,
    tags: row.tags,
    status: row.status,
    isBreaking: row.isBreaking,
    isLive: row.isLive,
    isExclusive: row.isExclusive,
    isDeveloping: row.isDeveloping,
    videoUrl: row.videoUrl ?? undefined,
  };
}

export async function getPublishedStories(options?: {
  category?: string;
  limit?: number;
  query?: string;
}): Promise<Story[]> {
  const limit = Math.min(options?.limit ?? 24, 100);

  if (!hasDatabase()) {
    return seedStories
      .filter((story) => !options?.category || story.category === options.category)
      .filter((story) => {
        if (!options?.query) return true;
        const needle = options.query.toLowerCase();
        return [story.headline, story.dek, story.location, ...story.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, limit);
  }

  try {
    const conditions = [eq(stories.status, "published")];
    if (options?.category) {
      conditions.push(eq(stories.categorySlug, options.category));
    }
    if (options?.query) {
      conditions.push(
        or(
          ilike(stories.headline, `%${options.query}%`),
          ilike(stories.dek, `%${options.query}%`),
          ilike(stories.location, `%${options.query}%`),
        )!,
      );
    }

    const rows = await getDb()
      .select()
      .from(stories)
      .where(and(...conditions))
      .orderBy(desc(stories.publishedAt))
      .limit(limit);

    return rows.map(normalizeStory);
  } catch (error) {
    console.error("Falling back to seeded stories", error);
    return seedStories.slice(0, limit);
  }
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  if (!hasDatabase()) {
    return seedStories.find((story) => story.slug === slug) ?? null;
  }

  try {
    const [row] = await getDb()
      .select()
      .from(stories)
      .where(and(eq(stories.slug, slug), eq(stories.status, "published")))
      .limit(1);

    return row ? normalizeStory(row) : null;
  } catch (error) {
    console.error("Falling back to seeded story", error);
    return seedStories.find((story) => story.slug === slug) ?? null;
  }
}

export function getCategoryLabel(slug: string) {
  const labels: Record<string, string> = {
    local: "Local",
    weather: "Weather",
    investigates: "Harborline Investigates",
    sports: "Sports",
    culture: "Things to Do",
  };
  return labels[slug] ?? slug.replaceAll("-", " ");
}
