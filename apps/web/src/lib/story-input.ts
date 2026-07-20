import { z } from "zod";

export const storyInput = z.object({
  headline: z.string().trim().min(8, "Enter a headline with at least 8 characters.").max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "The headline must produce a valid story URL."),
  dek: z.string().trim().min(10, "Enter a summary with at least 10 characters.").max(320),
  body: z.array(z.string().trim().min(1)).min(1, "Write at least one story paragraph."),
  categorySlug: z.enum(["local", "middlesex", "statehouse", "public-square", "opinion", "sports", "jersey-laurels", "investigates", "weather", "culture"]),
  categoryLabel: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2, "Enter a dateline or location.").max(80),
  imageUrl: z.url("Lead image must be a valid URL.").optional().or(z.literal("")),
  imageAlt: z.string().max(240).optional(),
  tags: z.array(z.string().max(40)).max(12).default([]),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(180).optional().or(z.literal("")),
  canonicalUrl: z.url("Canonical URL must be a complete URL.").optional().or(z.literal("")),
  noIndex: z.boolean().default(false),
  isBreaking: z.boolean().default(false),
  status: z.enum(["draft", "review", "scheduled", "published"]),
  scheduledAt: z.iso.datetime().optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.imageUrl && !value.imageAlt?.trim()) {
    context.addIssue({ code: "custom", path: ["imageAlt"], message: "Describe the lead image for readers using screen readers." });
  }
});

export type StoryInput = z.infer<typeof storyInput>;

export type StoryFieldErrors = Record<string, string[] | undefined>;

export function firstStoryError(fieldErrors: StoryFieldErrors) {
  for (const messages of Object.values(fieldErrors)) {
    if (messages?.[0]) return messages[0];
  }
  return "Check the highlighted story fields and try again.";
}
