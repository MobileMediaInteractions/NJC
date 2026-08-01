import { createHash } from "node:crypto";

export type StoryPublicationMaterial = {
  headline: string;
  dek: string;
  body: string[];
  whyItMatters: string | null;
  categorySlug: string;
  categoryLabel: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string | null;
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  publicBylineSnapshot: unknown;
  publicBylinesSnapshot?: unknown;
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
  return createHash("sha256")
    .update(JSON.stringify(stable(story)))
    .digest("hex");
}

export function storyPublicationBlockers(story: StoryPublicationMaterial) {
  const blockers: string[] = [];
  if (!story.headline.trim()) blockers.push("headline_missing");
  if (!story.dek.trim()) blockers.push("dek_missing");
  if (!story.body.some((paragraph) => paragraph.trim())) blockers.push("body_missing");
  if (story.imageUrl && !story.imageAlt?.trim()) blockers.push("lead_media_alt_missing");
  if (!story.publicBylineSnapshot) blockers.push("byline_missing");
  return blockers;
}
