import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { isAiStoryImageGeneration } from "@/lib/ai-story-image";

export class InvalidStoryLeadMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStoryLeadMediaError";
  }
}

export async function resolveStoryLeadMedia(input: {
  imageUrl?: string;
  imageAssetId?: string | null;
  imageKind?: "editorial" | "ai_placeholder";
}) {
  const imageUrl = input.imageUrl?.trim() || null;
  if (!imageUrl) {
    if (input.imageAssetId) {
      throw new InvalidStoryLeadMediaError(
        "Remove the selected media asset or restore its image URL.",
      );
    }
    return {
      imageUrl: null,
      imageAssetId: null,
      imageKind: "editorial" as const,
      imageGeneration: null,
    };
  }

  const [asset] = await getDb()
    .select({
      id: mediaAssets.id,
      blobUrl: mediaAssets.blobUrl,
      source: mediaAssets.source,
      metadata: mediaAssets.metadata,
    })
    .from(mediaAssets)
    .where(input.imageAssetId
      ? and(
          eq(mediaAssets.id, input.imageAssetId),
          eq(mediaAssets.blobUrl, imageUrl),
          isNull(mediaAssets.deletedAt),
        )
      : and(eq(mediaAssets.blobUrl, imageUrl), isNull(mediaAssets.deletedAt)))
    .limit(1);
  if (!asset) {
    if (input.imageKind === "ai_placeholder" || input.imageAssetId) {
      throw new InvalidStoryLeadMediaError(
        "The selected image no longer matches its media-library record.",
      );
    }
    return {
      imageUrl,
      imageAssetId: null,
      imageKind: "editorial" as const,
      imageGeneration: null,
    };
  }
  if (input.imageAssetId && (asset.id !== input.imageAssetId || asset.blobUrl !== imageUrl)) {
    throw new InvalidStoryLeadMediaError(
      "The selected image no longer matches its media-library record.",
    );
  }

  const generation = asset.metadata?.generation;
  const isPlaceholder = asset.source === "ai-story-placeholder";
  if (isPlaceholder && !isAiStoryImageGeneration(generation)) {
    throw new InvalidStoryLeadMediaError(
      "The generated placeholder is missing required provenance.",
    );
  }

  return {
    imageUrl,
    imageAssetId: asset.id,
    imageKind: isPlaceholder ? "ai_placeholder" as const : "editorial" as const,
    imageGeneration: isPlaceholder && isAiStoryImageGeneration(generation)
      ? generation
      : null,
  };
}
