import { createHash } from "node:crypto";

export type StoryPublicationMaterial = {
  slug?: string;
  headline: string;
  dek: string;
  body: string[];
  richBody?: unknown;
  whyItMatters: string | null;
  publicNoteType?: "editors_note" | "reporting_note" | "update_note" | null;
  publicNote?: string | null;
  categorySlug: string;
  categoryLabel: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string | null;
  imageAssetId?: string | null;
  imageKind?: string | null;
  imageGeneration?: unknown;
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  publicBylineSnapshot: unknown;
  publicBylinesSnapshot?: unknown;
  tags?: string[];
  isBreaking?: boolean;
  isLive?: boolean;
  isExclusive?: boolean;
  isDeveloping?: boolean;
};

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

export function storyContentHash(story: StoryPublicationMaterial) {
  // Callers pass full database rows. A TypeScript type does not remove their
  // extra properties: hashing the row would include contentHash itself and
  // invalidate every approval as soon as its hash is saved. Only reviewed
  // publication material belongs here; workflow state is checked separately.
  const material: StoryPublicationMaterial = {
    slug: story.slug ?? "",
    headline: story.headline,
    dek: story.dek,
    body: story.body,
    richBody: story.richBody ?? null,
    whyItMatters: story.whyItMatters,
    publicNoteType: story.publicNoteType ?? null,
    publicNote: story.publicNote ?? null,
    categorySlug: story.categorySlug,
    categoryLabel: story.categoryLabel,
    location: story.location,
    imageUrl: story.imageUrl,
    imageAlt: story.imageAlt,
    imageAssetId: story.imageAssetId ?? null,
    imageKind: story.imageKind ?? "editorial",
    imageGeneration: story.imageGeneration ?? null,
    videoUrl: story.videoUrl,
    seoTitle: story.seoTitle,
    seoDescription: story.seoDescription,
    canonicalUrl: story.canonicalUrl,
    noIndex: story.noIndex,
    publicBylineSnapshot: story.publicBylineSnapshot,
    publicBylinesSnapshot: story.publicBylinesSnapshot ?? [],
    tags: story.tags ?? [],
    isBreaking: story.isBreaking ?? false,
    isLive: story.isLive ?? false,
    isExclusive: story.isExclusive ?? false,
    isDeveloping: story.isDeveloping ?? false,
  };
  return createHash("sha256")
    .update(JSON.stringify(stable(material)))
    .digest("hex");
}

export function storyApprovalMatches(
  story: StoryPublicationMaterial & { id: string; contentVersion: number },
  approval: {
    storyId: string;
    contentVersion: number;
    contentHash: string;
    invalidatedAt: Date | string | null;
  } | null | undefined,
) {
  return Boolean(
    approval &&
      approval.invalidatedAt === null &&
      approval.storyId === story.id &&
      approval.contentVersion === story.contentVersion &&
      approval.contentHash === storyContentHash(story),
  );
}

export function storyPublicationBlockers(story: StoryPublicationMaterial) {
  const blockers: string[] = [];
  if (!story.headline.trim()) blockers.push("headline_missing");
  if (!story.dek.trim()) blockers.push("dek_missing");
  if (!story.body.some((paragraph) => paragraph.trim())) blockers.push("body_missing");
  if (story.imageUrl && !story.imageAlt?.trim()) blockers.push("lead_media_alt_missing");
  if (story.imageKind === "ai_placeholder") blockers.push("lead_media_temporary_ai_placeholder");
  if (Boolean(story.publicNoteType) !== Boolean(story.publicNote?.trim())) blockers.push("public_note_incomplete");
  if (!story.publicBylineSnapshot) blockers.push("byline_missing");
  return blockers;
}
