import { z } from "zod";

export const distributionPackageInput = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2_000).default(""),
  status: z.enum(["draft", "available", "expired", "revoked", "archived"]),
  availableAt: z.iso.datetime().nullable().optional(),
  embargoAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
  downloadPolicy: z.enum(["view_only", "grant_controlled", "download"]),
  termsText: z.string().trim().max(10_000).default(""),
}).superRefine((value, context) => {
  if (
    value.availableAt &&
    value.expiresAt &&
    new Date(value.expiresAt) <= new Date(value.availableAt)
  ) {
    context.addIssue({
      code: "custom",
      path: ["expiresAt"],
      message: "Expiration must be later than availability",
    });
  }
});

export const distributionGrantInput = z.object({
  userClerkId: z.string().trim().min(5).max(200),
  startsAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
  downloadAllowed: z.boolean().default(false),
});

export const distributionLibraryInput = z.object({
  itemId: z.uuid(),
  collection: z.string().trim().min(1).max(80).default("Saved"),
  favorite: z.boolean().default(false),
});

export const distributionProgressInput = z.object({
  fileId: z.uuid(),
  positionMs: z.number().int().min(0).max(86_400_000),
  durationMs: z.number().int().min(0).max(86_400_000),
  completed: z.boolean().default(false),
});

export const distributionUploadTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
] as const;

export const distributionUploadMaxBytes = 250 * 1024 * 1024;

export function distributionMediaKind(mimeType: string) {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json"
  ) return "text";
  return "file";
}
