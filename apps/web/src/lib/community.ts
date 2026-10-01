import { z } from "zod";

export const communityCategories = [
  ["community", "Community & neighborhood"],
  ["arts", "Arts & culture"],
  ["civic", "Civic life"],
  ["education", "Education"],
  ["fundraiser", "Fundraiser"],
  ["sports", "Sports & recreation"],
  ["volunteer", "Volunteer opportunity"],
  ["other", "Other"],
] as const;

const optionalHttpsUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use a complete HTTPS link or leave this blank");

const optionalDateTime = z.string().trim().max(40).refine((value) => !value || !Number.isNaN(Date.parse(value)), "Enter a valid date and time");

export const communityEventSubmissionInput = z.object({
  title: z.string().trim().min(5).max(160),
  category: z.enum(["community", "arts", "civic", "education", "fundraiser", "sports", "volunteer", "other"]),
  description: z.string().trim().min(30).max(4_000),
  startsAt: optionalDateTime,
  venue: z.string().trim().max(180).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  organizer: z.string().trim().max(160).optional().or(z.literal("")),
  externalUrl: optionalHttpsUrl,
  submitterName: z.string().trim().min(2).max(120),
  submitterEmail: z.email().max(254),
  website: z.string().max(300).optional().default(""),
});

export const communityBulletinInput = z.object({
  title: z.string().trim().min(5).max(160),
  category: z.enum(["community", "arts", "civic", "education", "fundraiser", "sports", "volunteer", "other"]),
  description: z.string().trim().min(30).max(4_000),
  startsAt: optionalDateTime,
  endsAt: optionalDateTime,
  venue: z.string().trim().max(180).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  organizer: z.string().trim().max(160).optional().or(z.literal("")),
  externalUrl: optionalHttpsUrl,
  status: z.enum(["draft", "published", "archived"]),
  isFeatured: z.boolean().default(false),
  submissionId: z.uuid().optional(),
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && Date.parse(value.endsAt) < Date.parse(value.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "The end time must be after the start time" });
  }
});

export const communitySubmissionStatusInput = z.object({
  status: z.enum(["reviewing", "declined"]),
});

export function communitySlug(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140) || "community-event";
}

export function canManageCommunity(role: string) {
  return role === "admin" || role === "editor" || role === "producer" || role === "reporter";
}

export function canPublishCommunity(role: string) {
  return role === "admin" || role === "editor" || role === "producer";
}
