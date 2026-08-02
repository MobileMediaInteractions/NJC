import { createHash, randomInt } from "node:crypto";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import {
  AI_STORY_IMAGE_PROVIDER,
  buildStoryImagePrompt,
  cloudflareImageFromResponse,
  DEFAULT_STORY_IMAGE_MODEL,
  generatedStoryImageAlt,
  storyImageDigest,
} from "@/lib/ai-story-image";
import { limitAiStoryImage } from "@/lib/ai-story-image-rate-limit";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";

export const maxDuration = 60;

const inputSchema = z.object({
  storyId: z.uuid().optional(),
  headline: z.string().trim().min(8).max(180),
  dek: z.string().trim().min(10).max(320),
  body: z.array(z.string().trim().min(1).max(5_000)).min(1).max(200),
  location: z.string().trim().min(2).max(80),
  categoryLabel: z.string().trim().min(2).max(80),
  visualDirection: z.string().trim().max(400).optional().default(""),
});

function configuredProvider() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN?.trim();
  const model = process.env.CLOUDFLARE_AI_IMAGE_MODEL?.trim() ||
    DEFAULT_STORY_IMAGE_MODEL;
  return accountId && token && /^@cf\/[a-z0-9-]+\/[a-z0-9._-]+$/i.test(model)
    ? { accountId, token, model }
    : null;
}

function imageBytes(base64: string) {
  const encoded = base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 1_000 || bytes.length > 12_000_000) return null;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return jpeg
    ? { bytes, mimeType: "image/jpeg", extension: "jpg" }
    : png
      ? { bytes, mimeType: "image/png", extension: "png" }
      : null;
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  }
  const configuration = await getSiteConfiguration();
  if (!configuration.studio.experience.aiImagePlaceholders) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "AI image placeholders are disabled in Studio Configuration" } },
      { status: 409 },
    );
  }
  if (!hasDatabase() || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres and Vercel Blob are required to generate placeholder media" } },
      { status: 503 },
    );
  }
  const provider = configuredProvider();
  if (!provider) {
    return NextResponse.json(
      { error: { code: "provider_not_configured", message: "Connect the free Workers AI provider before generating an image" } },
      { status: 503 },
    );
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Add a headline, summary and story copy before generating an image", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const limited = await limitAiStoryImage(viewer.id);
  if (!limited.success) {
    return NextResponse.json(
      { error: { code: "rate_limit_exceeded", message: "The hourly newsroom image limit has been reached. Try again later or upload an image." } },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limited.reset - Date.now()) / 1_000))) } },
    );
  }

  const prompt = buildStoryImagePrompt(parsed.data);
  const seed = randomInt(1, 2_147_483_647);
  const generatedAt = new Date().toISOString();
  const generation = {
    provider: AI_STORY_IMAGE_PROVIDER,
    model: provider.model,
    prompt,
    seed,
    storyDigest: storyImageDigest(parsed.data),
    generatedAt,
  };

  let storedBlobUrl: string | null = null;
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(provider.accountId)}/ai/run/${provider.model.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${provider.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt, steps: 8, seed }),
        signal: AbortSignal.timeout(50_000),
      },
    );
    const payload = await response.json().catch(() => null);
    const encodedImage = cloudflareImageFromResponse(payload);
    const image = encodedImage ? imageBytes(encodedImage) : null;
    if (!response.ok || !image) {
      const providerCode = response.status === 429
        ? "provider_quota_exhausted"
        : "generation_failed";
      const message = response.status === 429
        ? "The free daily image allowance is currently exhausted. It resets automatically; an uploaded image can still be used."
        : "The image provider could not create a usable placeholder. No media was saved.";
      console.error("AI story image provider failed", {
        status: response.status,
        provider: AI_STORY_IMAGE_PROVIDER,
        model: provider.model,
      });
      return NextResponse.json({ error: { code: providerCode, message } }, { status: response.status === 429 ? 429 : 502 });
    }

    const digest = generation.storyDigest.slice(0, 12);
    const filename = `ai-story-placeholder-${digest}-${seed}.${image.extension}`;
    const blob = await put(`newsroom/generated/${crypto.randomUUID()}-${filename}`, image.bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: image.mimeType,
    });
    storedBlobUrl = blob.url;
    const altText = generatedStoryImageAlt(parsed.data.headline);
    const [asset] = await getDb().insert(mediaAssets).values({
      blobUrl: blob.url,
      pathname: blob.pathname,
      filename,
      mimeType: image.mimeType,
      size: image.bytes.length,
      altText,
      credit: "AI-generated editorial illustration · NJ Courier Studio",
      license: "Temporary newsroom placeholder; not approved for publication",
      source: "ai-story-placeholder",
      extension: image.extension,
      sha256: createHash("sha256").update(image.bytes).digest("hex"),
      metadata: {
        generation,
        temporary: true,
        publicationBlocked: true,
        storyId: parsed.data.storyId ?? null,
      },
      uploadedById: viewer.databaseId ?? null,
      uploadedBySnapshot: { clerkId: viewer.id, name: viewer.name },
    }).returning({ id: mediaAssets.id });

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "media.ai_placeholder_generated",
      request,
      metadata: {
        assetId: asset.id,
        storyId: parsed.data.storyId,
        provider: generation.provider,
        model: generation.model,
        seed,
        storyDigest: generation.storyDigest,
      },
    });
    return NextResponse.json({
      data: {
        id: asset.id,
        url: blob.url,
        filename,
        imageKind: "ai_placeholder",
        altText,
        generation,
        publicationBlocked: true,
      },
      meta: { apiVersion: "1", rateLimitRemaining: limited.remaining },
    }, { status: 201 });
  } catch (error) {
    if (storedBlobUrl) await del(storedBlobUrl).catch(() => undefined);
    console.error("AI story image generation failed", {
      actorId: viewer.id,
      provider: AI_STORY_IMAGE_PROVIDER,
      model: provider.model,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json(
      { error: { code: "generation_failed", message: "The image could not be generated or stored. No placeholder was attached." } },
      { status: 502 },
    );
  }
}
