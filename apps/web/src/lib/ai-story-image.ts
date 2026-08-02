import { createHash } from "node:crypto";

export const DEFAULT_STORY_IMAGE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";
export const AI_STORY_IMAGE_PROVIDER = "cloudflare-workers-ai" as const;

export type AiStoryImageContext = {
  headline: string;
  dek: string;
  body: string[];
  location: string;
  categoryLabel: string;
  visualDirection?: string;
};

export type AiStoryImageGeneration = {
  provider: typeof AI_STORY_IMAGE_PROVIDER;
  model: string;
  prompt: string;
  seed: number;
  storyDigest: string;
  generatedAt: string;
};

function clean(value: string, limit: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function storyImageDigest(context: AiStoryImageContext) {
  return createHash("sha256")
    .update(JSON.stringify({
      headline: clean(context.headline, 180),
      dek: clean(context.dek, 320),
      body: context.body.map((paragraph) => clean(paragraph, 900)).slice(0, 5),
      location: clean(context.location, 80),
      categoryLabel: clean(context.categoryLabel, 80),
    }))
    .digest("hex");
}

export function buildStoryImagePrompt(context: AiStoryImageContext) {
  const excerpts = context.body
    .map((paragraph) => clean(paragraph, 500))
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  const direction = clean(context.visualDirection ?? "", 400);

  return [
    "Create a photorealistic editorial concept illustration for a local New Jersey news draft.",
    "Use a cinematic horizontal news-photo composition with natural light, realistic materials, restrained color, a clear subject, and generous edge-safe framing for a 16:9 crop.",
    `Section: ${clean(context.categoryLabel, 80)}.`,
    `Location context: ${clean(context.location, 80)}.`,
    `Headline context: ${clean(context.headline, 180)}.`,
    `Verified summary: ${clean(context.dek, 320)}.`,
    excerpts ? `Verified article context: ${excerpts}.` : "",
    direction ? `Editor visual direction: ${direction}.` : "",
    "Represent the subject through place, objects, environment, or unidentifiable background figures. Do not recreate the face or likeness of any named real person, do not fabricate a specific event as documentary evidence, and do not depict injury, gore, minors, private information, ballots, official seals, or emergency scenes. Use a safe symbolic treatment instead.",
    "Do not include words, captions, watermarks, logos, publication branding, signatures, or legible documents. Do not imitate a living artist or another news organization's visual identity.",
    "The result is a temporary AI-generated editorial illustration, not a press photograph.",
  ].filter(Boolean).join(" ").slice(0, 2048);
}

export function generatedStoryImageAlt(headline: string) {
  const cleanHeadline = clean(headline, 185);
  return `AI-generated editorial illustration for “${cleanHeadline}”.`.slice(0, 240);
}

export function isAiStoryImageGeneration(
  value: unknown,
): value is AiStoryImageGeneration {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.provider === AI_STORY_IMAGE_PROVIDER &&
    typeof record.model === "string" &&
    typeof record.prompt === "string" &&
    typeof record.seed === "number" &&
    typeof record.storyDigest === "string" &&
    typeof record.generatedAt === "string";
}

export function cloudflareImageFromResponse(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const result = (value as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const image = (result as { image?: unknown }).image;
  return typeof image === "string" && image.length > 0 ? image : null;
}
