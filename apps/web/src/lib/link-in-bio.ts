import { z } from "zod";

export const linkInBioEntryInput = z
  .object({
    storyId: z.uuid(),
    displayTitle: z.string().trim().max(160).optional().nullable(),
    startsAt: z.iso.datetime().optional().nullable(),
    endsAt: z.iso.datetime().optional().nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.startsAt &&
      value.endsAt &&
      new Date(value.endsAt) <= new Date(value.startsAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end time must be after the start time",
      });
    }
  });

export const linkInBioEntryUpdate = z
  .object({
    displayTitle: z.string().trim().max(160).optional().nullable(),
    isVisible: z.boolean().optional(),
    startsAt: z.iso.datetime().optional().nullable(),
    endsAt: z.iso.datetime().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, "Add at least one change")
  .superRefine((value, context) => {
    if (
      value.startsAt &&
      value.endsAt &&
      new Date(value.endsAt) <= new Date(value.startsAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end time must be after the start time",
      });
    }
  });

export const linkInBioOrderInput = z.object({
  order: z.array(z.uuid()).min(1).max(50),
});

export const socialSources = [
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "youtube",
  "threads",
  "linkedin",
  "bluesky",
] as const;

export function normalizeSocialSource(value: string | string[] | undefined) {
  const source = Array.isArray(value) ? value[0] : value;
  return socialSources.includes(source as (typeof socialSources)[number])
    ? source!
    : "link_in_bio";
}

export function buildLinkInBioStoryDestination(
  storySlug: string,
  source?: string | null,
) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.thejerseycourier.com";
  const destination = new URL(`/story/${encodeURIComponent(storySlug)}`, origin);
  destination.searchParams.set(
    "utm_source",
    normalizeSocialSource(source ?? undefined),
  );
  destination.searchParams.set("utm_medium", "social");
  destination.searchParams.set("utm_campaign", "link_in_bio");
  return destination;
}

export function isLinkInBioEntryLive(
  entry: {
    isVisible: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now = new Date(),
) {
  return Boolean(
    entry.isVisible &&
      (!entry.startsAt || entry.startsAt <= now) &&
      (!entry.endsAt || entry.endsAt > now),
  );
}
