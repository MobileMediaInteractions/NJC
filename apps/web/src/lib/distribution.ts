import "server-only";

import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  distributionAuditLogs,
  distributionFiles,
  distributionGrants,
  distributionPackageItems,
  distributionPackages,
  distributionPlaybackProgress,
  distributionUserLibrary,
  stories,
} from "@harborline/backend/schema";
import { getAccountIdentity, getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import {
  canManageDistribution,
  isDistributionDownloadAllowed,
} from "@/lib/distribution-policy";

export async function isDistributionEnabled() {
  if (process.env.DISTRIBUTION_ENABLED !== "true") return false;
  return (await getSiteConfiguration()).features.distribution;
}

export async function getDistributionIdentity() {
  if (!(await isDistributionEnabled())) return null;
  return getAccountIdentity();
}

export async function getDistributionManager() {
  const user = await getStudioUser();
  return user && canManageDistribution(user.role) ? user : null;
}

function activeGrantConditions(userClerkId: string, now = new Date()) {
  return and(
    eq(distributionGrants.userClerkId, userClerkId),
    isNull(distributionGrants.revokedAt),
    lte(distributionGrants.startsAt, now),
    or(
      isNull(distributionGrants.expiresAt),
      gt(distributionGrants.expiresAt, now),
    ),
  );
}

function availablePackageConditions(now = new Date()) {
  return and(
    eq(distributionPackages.status, "available"),
    or(
      isNull(distributionPackages.availableAt),
      lte(distributionPackages.availableAt, now),
    ),
    or(
      isNull(distributionPackages.expiresAt),
      gt(distributionPackages.expiresAt, now),
    ),
  );
}

export type DistributionLibraryPackage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  embargoAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
  downloadAllowed: boolean;
  itemCount: number;
  totalSize: number;
  mediaTypes: string[];
};

export type DistributionLibraryItem = {
  id: string;
  title: string;
  description: string;
  packageTitle: string;
  packageSlug: string;
  fileId: string | null;
  mimeType: string;
  size: number;
  createdAt: Date;
  collection: string | null;
  favorite: boolean;
};

export async function getDistributionLibrary(
  userClerkId: string,
): Promise<DistributionLibraryPackage[]> {
  if (!hasDatabase()) return [];
  const now = new Date();
  const packages = await getDb()
    .select({
      package: distributionPackages,
      downloadAllowed: distributionGrants.downloadAllowed,
    })
    .from(distributionGrants)
    .innerJoin(
      distributionPackages,
      eq(distributionPackages.id, distributionGrants.packageId),
    )
    .where(
      and(
        activeGrantConditions(userClerkId, now),
        availablePackageConditions(now),
      ),
    )
    .orderBy(desc(distributionPackages.updatedAt));
  if (!packages.length) return [];
  const ids = packages.map((row) => row.package.id);
  const items = await getDb()
    .select({
      packageId: distributionPackageItems.packageId,
      fileSize: distributionFiles.size,
      mimeType: distributionFiles.mimeType,
    })
    .from(distributionPackageItems)
    .leftJoin(
      distributionFiles,
      eq(distributionFiles.id, distributionPackageItems.fileId),
    )
    .where(inArray(distributionPackageItems.packageId, ids));
  const summary = new Map<
    string,
    { count: number; size: number; types: Set<string> }
  >();
  for (const item of items) {
    const current = summary.get(item.packageId) ?? {
      count: 0,
      size: 0,
      types: new Set<string>(),
    };
    current.count += 1;
    current.size += item.fileSize ?? 0;
    if (item.mimeType) current.types.add(item.mimeType.split("/")[0] ?? "file");
    else current.types.add("story");
    summary.set(item.packageId, current);
  }
  return packages.map(({ package: record, downloadAllowed }) => {
    const details = summary.get(record.id);
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      description: record.description,
      embargoAt: record.embargoAt,
      expiresAt: record.expiresAt,
      updatedAt: record.updatedAt,
      downloadAllowed: isDistributionDownloadAllowed(
        record.downloadPolicy,
        downloadAllowed,
      ),
      itemCount: details?.count ?? 0,
      totalSize: details?.size ?? 0,
      mediaTypes: [...(details?.types ?? [])],
    };
  });
}

export async function getDistributionLibraryItems(
  userClerkId: string,
): Promise<DistributionLibraryItem[]> {
  if (!hasDatabase()) return [];
  const now = new Date();
  const rows = await getDb()
    .select({
      item: distributionPackageItems,
      package: distributionPackages,
      file: distributionFiles,
      library: distributionUserLibrary,
    })
    .from(distributionPackageItems)
    .innerJoin(
      distributionPackages,
      eq(distributionPackages.id, distributionPackageItems.packageId),
    )
    .innerJoin(
      distributionGrants,
      eq(distributionGrants.packageId, distributionPackages.id),
    )
    .leftJoin(
      distributionFiles,
      eq(distributionFiles.id, distributionPackageItems.fileId),
    )
    .leftJoin(
      distributionUserLibrary,
      and(
        eq(distributionUserLibrary.itemId, distributionPackageItems.id),
        eq(distributionUserLibrary.userClerkId, userClerkId),
      ),
    )
    .where(
      and(
        activeGrantConditions(userClerkId, now),
        availablePackageConditions(now),
        or(
          isNull(distributionFiles.deletedAt),
          isNull(distributionPackageItems.fileId),
        ),
      ),
    )
    .orderBy(desc(distributionPackageItems.createdAt));
  return rows.map((row) => ({
    id: row.item.id,
    title: row.item.title,
    description: row.item.description,
    packageTitle: row.package.title,
    packageSlug: row.package.slug,
    fileId: row.file?.id ?? null,
    mimeType: row.file?.mimeType ?? "story/advance",
    size: row.file?.size ?? 0,
    createdAt: row.file?.createdAt ?? row.item.createdAt,
    collection: row.library?.collection ?? null,
    favorite: row.library?.favorite ?? false,
  }));
}

export async function getDistributionPackageForManager(id: string) {
  if (!hasDatabase()) return null;
  const [record] = await getDb()
    .select()
    .from(distributionPackages)
    .where(eq(distributionPackages.id, id))
    .limit(1);
  if (!record) return null;
  const [items, grants] = await Promise.all([
    getDb()
      .select({
        item: distributionPackageItems,
        file: distributionFiles,
        story: stories,
      })
      .from(distributionPackageItems)
      .leftJoin(
        distributionFiles,
        eq(distributionFiles.id, distributionPackageItems.fileId),
      )
      .leftJoin(stories, eq(stories.id, distributionPackageItems.storyId))
      .where(eq(distributionPackageItems.packageId, id))
      .orderBy(asc(distributionPackageItems.sortOrder)),
    getDb()
      .select()
      .from(distributionGrants)
      .where(eq(distributionGrants.packageId, id))
      .orderBy(desc(distributionGrants.updatedAt)),
  ]);
  return {
    ...record,
    items: items.map((row) => ({
      ...row.item,
      file: row.file
        ? {
            id: row.file.id,
            filename: row.file.filename,
            mimeType: row.file.mimeType,
            size: row.file.size,
            processingStatus: row.file.processingStatus,
          }
        : null,
      story: row.story
        ? {
            id: row.story.id,
            headline:
              row.item.storySnapshot?.headline ?? row.story.headline,
          }
        : null,
    })),
    grants,
  };
}

export async function getAuthorizedDistributionPackage(
  userClerkId: string,
  slug: string,
) {
  if (!hasDatabase()) return null;
  const now = new Date();
  const [row] = await getDb()
    .select({
      package: distributionPackages,
      downloadAllowed: distributionGrants.downloadAllowed,
    })
    .from(distributionPackages)
    .innerJoin(
      distributionGrants,
      eq(distributionGrants.packageId, distributionPackages.id),
    )
    .where(
      and(
        eq(distributionPackages.slug, slug),
        activeGrantConditions(userClerkId, now),
        availablePackageConditions(now),
      ),
    )
    .limit(1);
  if (!row) return null;
  const items = await getDb()
    .select({
      item: distributionPackageItems,
      file: distributionFiles,
      story: stories,
      library: distributionUserLibrary,
    })
    .from(distributionPackageItems)
    .leftJoin(
      distributionFiles,
      eq(distributionFiles.id, distributionPackageItems.fileId),
    )
    .leftJoin(stories, eq(stories.id, distributionPackageItems.storyId))
    .leftJoin(
      distributionUserLibrary,
      and(
        eq(distributionUserLibrary.itemId, distributionPackageItems.id),
        eq(distributionUserLibrary.userClerkId, userClerkId),
      ),
    )
    .where(eq(distributionPackageItems.packageId, row.package.id))
    .orderBy(asc(distributionPackageItems.sortOrder));
  return {
    id: row.package.id,
    slug: row.package.slug,
    title: row.package.title,
    description: row.package.description,
    status: row.package.status,
    availableAt: row.package.availableAt,
    embargoAt: row.package.embargoAt,
    expiresAt: row.package.expiresAt,
    downloadPolicy: row.package.downloadPolicy,
    termsText: row.package.termsText,
    createdAt: row.package.createdAt,
    updatedAt: row.package.updatedAt,
    downloadAllowed: isDistributionDownloadAllowed(
      row.package.downloadPolicy,
      row.downloadAllowed,
    ),
    items: items
      .filter((item) => !item.file?.deletedAt)
      .map((item) => ({
        id: item.item.id,
        title: item.item.title,
        description: item.item.description,
        sortOrder: item.item.sortOrder,
        file: item.file
          ? {
              id: item.file.id,
              filename: item.file.filename,
              mimeType: item.file.mimeType,
              size: item.file.size,
              width: item.file.width,
              height: item.file.height,
              durationMs: item.file.durationMs,
              createdAt: item.file.createdAt,
            }
          : null,
        story: item.story
          ? {
              id: item.story.id,
              headline: item.story.headline,
              dek: item.story.dek,
              body: item.story.body,
              categoryLabel: item.story.categoryLabel,
            }
          : null,
        collection: item.library?.collection ?? null,
        favorite: item.library?.favorite ?? false,
      })),
  };
}

export async function getAuthorizedDistributionFile(
  userClerkId: string,
  fileId: string,
) {
  if (!hasDatabase()) return null;
  const now = new Date();
  const [row] = await getDb()
    .select({
      file: distributionFiles,
      item: distributionPackageItems,
      package: distributionPackages,
      grant: distributionGrants,
      progress: distributionPlaybackProgress,
    })
    .from(distributionFiles)
    .innerJoin(
      distributionPackageItems,
      eq(distributionPackageItems.fileId, distributionFiles.id),
    )
    .innerJoin(
      distributionPackages,
      eq(distributionPackages.id, distributionPackageItems.packageId),
    )
    .innerJoin(
      distributionGrants,
      eq(distributionGrants.packageId, distributionPackages.id),
    )
    .leftJoin(
      distributionPlaybackProgress,
      and(
        eq(distributionPlaybackProgress.fileId, distributionFiles.id),
        eq(distributionPlaybackProgress.userClerkId, userClerkId),
      ),
    )
    .where(
      and(
        eq(distributionFiles.id, fileId),
        isNull(distributionFiles.deletedAt),
        eq(distributionFiles.processingStatus, "ready"),
        activeGrantConditions(userClerkId, now),
        availablePackageConditions(now),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row.file,
    itemId: row.item.id,
    itemTitle: row.item.title,
    itemDescription: row.item.description,
    packageSlug: row.package.slug,
    packageTitle: row.package.title,
    embargoAt: row.package.embargoAt,
    downloadAllowed: isDistributionDownloadAllowed(
      row.package.downloadPolicy,
      row.grant.downloadAllowed,
    ),
    progress: row.progress,
  };
}

export async function getAuthorizedDistributionStoryItem(
  userClerkId: string,
  itemId: string,
) {
  if (!hasDatabase()) return null;
  const now = new Date();
  const [row] = await getDb()
    .select({
      item: distributionPackageItems,
      story: stories,
      package: distributionPackages,
    })
    .from(distributionPackageItems)
    .innerJoin(stories, eq(stories.id, distributionPackageItems.storyId))
    .innerJoin(
      distributionPackages,
      eq(distributionPackages.id, distributionPackageItems.packageId),
    )
    .innerJoin(
      distributionGrants,
      eq(distributionGrants.packageId, distributionPackages.id),
    )
    .where(
      and(
        eq(distributionPackageItems.id, itemId),
        activeGrantConditions(userClerkId, now),
        availablePackageConditions(now),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    story: row.item.storySnapshot
      ? {
          ...row.story,
          headline: row.item.storySnapshot.headline,
          dek: row.item.storySnapshot.dek,
          body: row.item.storySnapshot.body,
          categoryLabel: row.item.storySnapshot.categoryLabel,
        }
      : row.story,
  };
}

export async function canAccessDistributionItem(
  userClerkId: string,
  itemId: string,
) {
  if (!hasDatabase()) return false;
  const now = new Date();
  const [row] = await getDb()
    .select({ id: distributionPackageItems.id })
    .from(distributionPackageItems)
    .innerJoin(
      distributionPackages,
      eq(distributionPackages.id, distributionPackageItems.packageId),
    )
    .innerJoin(
      distributionGrants,
      eq(distributionGrants.packageId, distributionPackages.id),
    )
    .where(
      and(
        eq(distributionPackageItems.id, itemId),
        activeGrantConditions(userClerkId, now),
        availablePackageConditions(now),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function writeDistributionAudit(input: {
  request?: Request;
  actorClerkId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!hasDatabase()) return;
  const address = input.request?.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const pepper = process.env.API_KEY_PEPPER;
  const ipHash = address && pepper
    ? createHash("sha256")
        .update(`${pepper}:distribution:${address}`)
        .digest("hex")
    : null;
  await getDb().insert(distributionAuditLogs).values({
    actorClerkId: input.actorClerkId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    ipHash,
  });
}
