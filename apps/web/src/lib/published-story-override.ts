import { z } from "zod";
import type { StaffRole, StoryStatus } from "@/lib/types";
import { canPublishStory } from "@/lib/story-workflow";

export const publishedStoryOverridePurposes = [
  "correction",
  "material_update",
  "legal_safety",
  "transparency",
] as const;

export type PublishedStoryOverridePurpose =
  (typeof publishedStoryOverridePurposes)[number];

export const publishedStoryOverrideLabels: Record<
  PublishedStoryOverridePurpose,
  string
> = {
  correction: "Factual correction",
  material_update: "Material new reporting",
  legal_safety: "Legal or safety issue",
  transparency: "Transparency or disclosure",
};

export const publishedStoryOverrideInput = z.object({
  action: z.literal("reopen_editing"),
  purpose: z.enum(publishedStoryOverridePurposes),
  reason: z
    .string()
    .trim()
    .min(20, "Explain why this published story must be reopened (20 characters minimum).")
    .max(1_000, "Keep the override reason under 1,000 characters."),
  confirmation: z.literal("REOPEN STORY"),
});

export type PublishedStoryOverrideBlocker =
  | "forbidden"
  | "feature_disabled"
  | "not_published"
  | "already_active"
  | "revision_pending"
  | null;

export function getPublishedStoryOverrideBlocker({
  role,
  status,
  isActive,
  featureEnabled,
  hasPendingRevision,
}: {
  role: StaffRole;
  status: StoryStatus;
  isActive: boolean;
  featureEnabled: boolean;
  hasPendingRevision: boolean;
}): PublishedStoryOverrideBlocker {
  if (!canPublishStory(role)) return "forbidden";
  if (!featureEnabled) return "feature_disabled";
  if (status !== "published") return "not_published";
  if (isActive) return "already_active";
  if (hasPendingRevision) return "revision_pending";
  return null;
}
