import "server-only";

import { desc, isNull, ne } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, premiumContent, premiumTiers } from "@harborline/backend/schema";
import type { GuidedOption } from "@/components/studio/guided-selectors";

export type NjcPlusEditorOptions = {
  content: GuidedOption[];
  tiers: GuidedOption[];
  images: GuidedOption[];
  media: GuidedOption[];
};

export async function getNjcPlusEditorOptions(
  excludeContentId?: string,
): Promise<NjcPlusEditorOptions> {
  if (!hasDatabase()) return { content: [], tiers: [], images: [], media: [] };

  const [contentRecords, tierRecords, assetRecords] = await Promise.all([
    excludeContentId
      ? getDb().select({
          id: premiumContent.id,
          title: premiumContent.title,
          kind: premiumContent.kind,
          status: premiumContent.status,
        }).from(premiumContent).where(ne(premiumContent.id, excludeContentId)).orderBy(desc(premiumContent.updatedAt)).limit(500)
      : getDb().select({
          id: premiumContent.id,
          title: premiumContent.title,
          kind: premiumContent.kind,
          status: premiumContent.status,
        }).from(premiumContent).orderBy(desc(premiumContent.updatedAt)).limit(500),
    getDb().select({
      id: premiumTiers.id,
      name: premiumTiers.name,
      description: premiumTiers.description,
    }).from(premiumTiers).limit(100),
    getDb().select({
      id: mediaAssets.id,
      filename: mediaAssets.filename,
      mimeType: mediaAssets.mimeType,
      blobUrl: mediaAssets.blobUrl,
      altText: mediaAssets.altText,
      durationMs: mediaAssets.durationMs,
      visibility: mediaAssets.visibility,
    }).from(mediaAssets).where(isNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.updatedAt)).limit(500),
  ]);

  const content = contentRecords.map((item) => ({
    value: item.id,
    label: item.title,
    description: `${item.kind} · ${item.status}`,
  }));
  const tiers = tierRecords.map((item) => ({
    value: item.id,
    label: item.name,
    description: item.description,
  }));
  const assets = assetRecords.map((item) => ({
    value: item.id,
    label: item.filename,
    description: item.mimeType,
    metadata: {
      url: item.visibility === "private" || item.visibility === "internal" ? `/api/v1/studio/media/${item.id}/content` : item.blobUrl,
      mimeType: item.mimeType,
      altText: item.altText,
      durationMs: item.durationMs,
      visibility: item.visibility,
    },
  }));

  return {
    content,
    tiers,
    images: assets.filter((item) => item.metadata.mimeType.startsWith("image/")),
    media: assets.filter((item) => item.metadata.mimeType.startsWith("video/") || item.metadata.mimeType.startsWith("audio/")),
  };
}
