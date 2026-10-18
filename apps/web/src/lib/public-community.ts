import { cache } from "react";
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityBulletins } from "@harborline/backend/schema";
import { isCommunitySlug, type PublicCommunityBulletin } from "@/lib/community-public-model";

// Explicit public projection: never send staff IDs, submissions or contact data.
// Keep this compatible with the deployed bulletin schema; no pending migration is required.
const publicColumns = {
  id: communityBulletins.id, slug: communityBulletins.slug,
  title: communityBulletins.title, category: communityBulletins.category,
  description: communityBulletins.description, startsAt: communityBulletins.startsAt,
  endsAt: communityBulletins.endsAt, venue: communityBulletins.venue,
  city: communityBulletins.city, organizer: communityBulletins.organizer,
  externalUrl: communityBulletins.externalUrl, isFeatured: communityBulletins.isFeatured,
  publishedAt: communityBulletins.publishedAt, updatedAt: communityBulletins.updatedAt,
};

export function publicCommunityCondition(now: Date) {
  return and(
    eq(communityBulletins.status, "published"),
    lte(communityBulletins.publishedAt, now),
  );
}

export async function getPublicCommunityBulletins(limit = 36): Promise<{ bulletins: PublicCommunityBulletin[]; available: boolean }> {
  if (!hasDatabase()) return { bulletins: [], available: false };
  const now = new Date();
  try {
    const bulletins = await getDb().select(publicColumns).from(communityBulletins)
      .where(and(publicCommunityCondition(now), or(
        isNull(communityBulletins.startsAt),
        gte(communityBulletins.startsAt, now),
        gte(communityBulletins.endsAt, now),
      )))
      .orderBy(desc(communityBulletins.isFeatured), asc(communityBulletins.startsAt), desc(communityBulletins.publishedAt))
      .limit(Math.max(1, Math.min(36, Math.trunc(limit) || 36)));
    return { bulletins, available: true };
  } catch (error) {
    console.error("Public community bulletin lookup failed", error);
    return { bulletins: [], available: false };
  }
}

// Past events keep their permalink. Unpublished/archived/deleted listings do not.
// A database failure is allowed to reach the retryable page error boundary, not cached as a false 404.
export const getPublicCommunityBulletin = cache(async (slug: string): Promise<PublicCommunityBulletin | null> => {
  if (!isCommunitySlug(slug) || !hasDatabase()) return null;
  const [bulletin] = await getDb().select(publicColumns).from(communityBulletins)
    .where(and(publicCommunityCondition(new Date()), eq(communityBulletins.slug, slug)))
    .limit(1);
  return bulletin ?? null;
});
