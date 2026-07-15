import { and, desc, eq, gte, ilike, isNull, or } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { seedStories } from "@/lib/seed";
import type { Story } from "@/lib/types";

export function normalizeStory(row: typeof stories.$inferSelect): Story {
  const fallbackAuthor = {
    id: "courier-desk",
    name: "Courier Newsroom",
    role: "Middlesex County desk",
    initials: "NJC",
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
    imageAlt: row.imageAlt ?? "Middlesex County news",
    author: row.authorSnapshot ?? fallbackAuthor,
    tags: row.tags,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    canonicalUrl: row.canonicalUrl ?? undefined,
    noIndex: row.noIndex,
    status: row.status,
    isBreaking: row.isBreaking,
    isLive: row.isLive,
    isExclusive: row.isExclusive,
    isDeveloping: row.isDeveloping,
    videoUrl: row.videoUrl ?? undefined,
  };
}

export type PublishedStoryIndexEntry = Pick<
  Story,
  "slug" | "headline" | "publishedAt" | "updatedAt" | "noIndex"
>;

export async function getPublishedStoryIndex(options?: {
  limit?: number;
  since?: Date;
}): Promise<PublishedStoryIndexEntry[]> {
  const limit = Math.min(options?.limit ?? 50_000, 50_000);

  if (!hasDatabase()) {
    return seedStories
      .filter((story) => !story.noIndex && !story.canonicalUrl)
      .filter((story) => !options?.since || new Date(story.publishedAt) >= options.since)
      .slice(0, limit)
      .map(({ slug, headline, publishedAt, updatedAt, noIndex }) => ({ slug, headline, publishedAt, updatedAt, noIndex }));
  }

  try {
    const conditions = [
      eq(stories.status, "published"),
      eq(stories.noIndex, false),
      or(isNull(stories.canonicalUrl), eq(stories.canonicalUrl, ""))!,
    ];
    if (options?.since) conditions.push(gte(stories.publishedAt, options.since));
    const rows = await getDb()
      .select({
        slug: stories.slug,
        headline: stories.headline,
        publishedAt: stories.publishedAt,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        noIndex: stories.noIndex,
      })
      .from(stories)
      .where(and(...conditions))
      .orderBy(desc(stories.publishedAt))
      .limit(limit);

    return rows.map((row) => ({
      slug: row.slug,
      headline: row.headline,
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      noIndex: row.noIndex,
    }));
  } catch (error) {
    console.error("Falling back to seeded story index", error);
    return seedStories.filter((story) => !story.noIndex && !story.canonicalUrl).slice(0, limit).map(({ slug, headline, publishedAt, updatedAt, noIndex }) => ({ slug, headline, publishedAt, updatedAt, noIndex }));
  }
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
    local: "Middlesex County",
    middlesex: "Middlesex County",
    statehouse: "Statehouse Desk",
    "public-square": "Public Square",
    opinion: "Garden State Forum",
    "jersey-laurels": "Jersey Laurels",
    weather: "Weather",
    investigates: "Courier Watch",
    sports: "Jersey Gridiron & Court",
    culture: "Life in Middlesex",
  };
  return labels[slug] ?? slug.replaceAll("-", " ");
}
