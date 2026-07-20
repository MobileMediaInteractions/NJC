export const MAX_STORY_IMAGE_BYTES = 4_000_000;

export const STORY_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function validateStoryImage(file: { size: number; type: string }) {
  if (!STORY_IMAGE_TYPES.includes(file.type as (typeof STORY_IMAGE_TYPES)[number])) {
    return "Choose a JPEG, PNG or WebP image.";
  }
  if (file.size > MAX_STORY_IMAGE_BYTES) {
    return "Images must be 4 MB or smaller.";
  }
  if (file.size === 0) {
    return "The selected image is empty.";
  }
  return null;
}

export function safeUploadFilename(filename: string) {
  const leafName = filename.split(/[\\/]/).at(-1) ?? "";
  const normalized = leafName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || "story-image";
}
