import { z } from "zod";
import type { premiumContent } from "@harborline/backend/schema";

export const premiumContentKinds = [
  "story", "article", "video", "show", "episode", "clip", "series",
  "miniseries", "podcast", "podcast_episode", "investigation",
  "documentary", "live", "audio", "collection", "topic", "breaking",
] as const;

export const premiumContentStatuses = [
  "draft", "review", "approved", "scheduled", "published", "unpublished", "archived",
] as const;

export const premiumPaywallPolicies = [
  "free", "registration", "njc_plus", "specific_tier", "direct_payment",
  "access_credits", "money_or_credits", "rental", "promotion",
] as const;

export const premiumTimelineSegmentTypes = ["intro", "recap", "credits", "custom"] as const;

export const premiumTimelineSegmentInput = z.object({
  id: z.uuid().optional(),
  segmentType: z.enum(premiumTimelineSegmentTypes),
  startMs: z.number().int().min(0).max(604_800_000),
  endMs: z.number().int().min(1).max(604_800_000),
  internalName: z.string().trim().max(120).nullable().optional(),
  viewerLabel: z.string().trim().max(50).nullable().optional(),
  skippable: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
}).superRefine((value, context) => {
  if (value.endMs <= value.startMs) {
    context.addIssue({ code: "custom", path: ["endMs"], message: "Segment end must be after its start" });
  }
  if (value.segmentType === "custom" && !value.internalName) {
    context.addIssue({ code: "custom", path: ["internalName"], message: "Custom segments require an internal name" });
  }
  if (value.skippable && value.segmentType === "custom" && !value.viewerLabel) {
    context.addIssue({ code: "custom", path: ["viewerLabel"], message: "Skippable custom segments require a viewer label" });
  }
});

export const premiumPreviewQuestionInput = z.object({
  id: z.uuid().optional(),
  prompt: z.string().trim().min(3).max(500),
  questionType: z.enum(["rating", "multiple_choice", "yes_no", "free_response"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  sortOrder: z.number().int().min(0).max(1_000).default(0),
}).superRefine((value, context) => {
  if (value.questionType === "multiple_choice" && value.options.length < 2) {
    context.addIssue({ code: "custom", path: ["options"], message: "Multiple choice questions require at least two choices" });
  }
});

export const premiumPreviewConfigurationInput = z.object({
  enabled: z.boolean(),
  disclaimer: z.string().trim().min(40).max(2_000),
  opensAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
  questions: z.array(premiumPreviewQuestionInput).max(50).default([]),
}).superRefine((value, context) => {
  if (value.opensAt && value.expiresAt && new Date(value.expiresAt) <= new Date(value.opensAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Preview expiration must be after its opening" });
  }
});

export const premiumContentInput = z.object({
  kind: z.enum(premiumContentKinds),
  status: z.enum(premiumContentStatuses).default("draft"),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(240),
  eyebrow: z.string().trim().max(80).default("NJC+"),
  summary: z.string().trim().max(600).default(""),
  body: z.array(z.string().trim().max(20_000)).max(250).default([]),
  parentId: z.uuid().nullable().optional(),
  seasonNumber: z.number().int().min(0).max(999).nullable().optional(),
  episodeNumber: z.number().int().min(0).max(9_999).nullable().optional(),
  durationMs: z.number().int().min(0).max(604_800_000).nullable().optional(),
  imageAssetId: z.uuid().nullable().optional(),
  imageUrl: z.url().or(z.literal("")).nullable().optional(),
  imageAlt: z.string().trim().max(240).nullable().optional(),
  mediaAssetId: z.uuid().nullable().optional(),
  mediaUrl: z.url().or(z.literal("")).nullable().optional(),
  mediaMimeType: z.string().trim().max(100).nullable().optional(),
  captionsUrl: z.url().or(z.literal("")).nullable().optional(),
  transcript: z.string().max(500_000).nullable().optional(),
  authors: z.array(z.object({ id: z.string().optional(), name: z.string().min(1).max(100), role: z.string().max(100).optional() })).max(30).default([]),
  speakers: z.array(z.object({ name: z.string().min(1).max(100), role: z.string().max(100).optional() })).max(100).default([]),
  categories: z.array(z.string().min(1).max(80)).max(30).default([]),
  tags: z.array(z.string().min(1).max(80)).max(80).default([]),
  relatedIds: z.array(z.uuid()).max(80).default([]),
  paywallPolicy: z.enum(premiumPaywallPolicies).default("njc_plus"),
  requiredTierIds: z.array(z.uuid()).max(20).default([]),
  previewSeconds: z.number().int().min(0).max(86_400).default(0),
  rentalHours: z.number().int().min(1).max(8_760).nullable().optional(),
  commentsEnabled: z.boolean().default(false),
  isLive: z.boolean().default(false),
  isBreaking: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isOriginal: z.boolean().default(false),
  globalIntroEnabled: z.boolean().default(true),
  seoTitle: z.string().trim().max(180).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
  socialImageUrl: z.url().or(z.literal("")).nullable().optional(),
  noIndex: z.boolean().default(false),
  scheduledAt: z.iso.datetime().nullable().optional(),
}).superRefine((value, context) => {
  if (value.status === "scheduled" && !value.scheduledAt) {
    context.addIssue({ code: "custom", path: ["scheduledAt"], message: "Scheduled content requires a publish date and time" });
  }
  if (value.imageUrl && !value.imageAlt?.trim()) {
    context.addIssue({ code: "custom", path: ["imageAlt"], message: "Lead media requires accessible alternative text" });
  }
  if (value.status === "published" && premiumKindFormat(value.kind) === "article" && value.body.length === 0) {
    context.addIssue({ code: "custom", path: ["body"], message: "Published written content requires article copy" });
  }
  if (value.status === "published" && premiumKindFormat(value.kind) !== "article" && !value.mediaUrl) {
    context.addIssue({ code: "custom", path: ["mediaUrl"], message: "Published audio and video require a media source" });
  }
});

export type PremiumContentInput = z.infer<typeof premiumContentInput>;
export type PremiumContentRecord = typeof premiumContent.$inferSelect;
export type PremiumTimelineSegmentInput = z.infer<typeof premiumTimelineSegmentInput>;
export type PremiumPreviewConfigurationInput = z.infer<typeof premiumPreviewConfigurationInput>;

const visualKinds = new Set(["video", "show", "episode", "clip", "series", "miniseries", "investigation", "documentary", "live", "breaking"]);
const audioKinds = new Set(["audio", "podcast", "podcast_episode"]);

export function premiumKindLabel(kind: string) {
  return kind.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function premiumKindFormat(kind: string) {
  if (audioKinds.has(kind)) return "audio" as const;
  if (visualKinds.has(kind)) return "video" as const;
  return "article" as const;
}
