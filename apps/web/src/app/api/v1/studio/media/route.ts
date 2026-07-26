import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, mediaAssetUsages } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { safeUploadFilename, validateStoryImage } from "@/lib/media-upload";
import { writePremiumAudit } from "@/lib/njc-plus";

const querySchema = z.object({
  q: z.string().trim().max(120).default(""),
  type: z.enum(["all", "image", "video", "audio", "document"]).default("all"),
  status: z.string().trim().max(40).default("all"),
  visibility: z.string().trim().max(40).default("all"),
  usage: z.enum(["all", "used", "orphaned"]).default("all"),
  deleted: z.enum(["active", "deleted", "all"]).default("active"),
  sort: z.enum(["filename", "size", "createdAt", "mimeType", "usage"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(24),
});

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1", total: 0, page: 1, pageSize: 24 } });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_query", message: "Check the media filters" } }, { status: 400 });
  const query = parsed.data;
  const usage = getDb().select({ assetId: mediaAssetUsages.assetId, value: count() }).from(mediaAssetUsages).groupBy(mediaAssetUsages.assetId).as("media_usage");
  const conditions = [];
  if (query.q) conditions.push(ilike(mediaAssets.filename, `%${query.q}%`));
  if (query.type !== "all") conditions.push(ilike(mediaAssets.mimeType, `${query.type === "document" ? "application" : query.type}/%`));
  if (query.status !== "all") conditions.push(eq(mediaAssets.processingStatus, query.status));
  if (query.visibility !== "all") conditions.push(eq(mediaAssets.visibility, query.visibility));
  if (query.deleted === "active") conditions.push(isNull(mediaAssets.deletedAt));
  if (query.deleted === "deleted") conditions.push(isNotNull(mediaAssets.deletedAt));
  if (query.usage === "used") conditions.push(isNotNull(usage.assetId));
  if (query.usage === "orphaned") conditions.push(isNull(usage.assetId));
  const where = conditions.length ? and(...conditions) : undefined;
  const sortColumns = { filename: mediaAssets.filename, size: mediaAssets.size, createdAt: mediaAssets.createdAt, mimeType: mediaAssets.mimeType, usage: sql<number>`coalesce(${usage.value}, 0)` };
  const order = query.direction === "asc" ? asc(sortColumns[query.sort]) : desc(sortColumns[query.sort]);
  const rows = await getDb().select({ asset: mediaAssets, usageCount: sql<number>`coalesce(${usage.value}, 0)` }).from(mediaAssets).leftJoin(usage, eq(mediaAssets.id, usage.assetId)).where(where).orderBy(order).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
  const assetIds = rows.map((row) => row.asset.id);
  const usageRows = assetIds.length ? await getDb().select().from(mediaAssetUsages).where(inArray(mediaAssetUsages.assetId, assetIds)) : [];
  const usagesByAsset = new Map<string, typeof usageRows>();
  for (const item of usageRows) usagesByAsset.set(item.assetId, [...(usagesByAsset.get(item.assetId) ?? []), item]);
  const [total] = await getDb().select({ value: count() }).from(mediaAssets).leftJoin(usage, eq(mediaAssets.id, usage.assetId)).where(where);
  return NextResponse.json({ data: rows.map((row) => ({ ...row.asset, usageCount: Number(row.usageCount), usages: usagesByAsset.get(row.asset.id) ?? [] })), meta: { apiVersion: "1", total: Number(total?.value ?? 0), page: query.page, pageSize: query.pageSize } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Vercel Blob before uploading media" } }, { status: 503 });
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: { code: "invalid_request", message: "The upload form could not be read" } }, { status: 400 });
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: { code: "invalid_request", message: "A file is required" } }, { status: 400 });
  const validationError = validateStoryImage(file);
  if (validationError) {
    const status = file.size > 4_000_000 ? 413 : 415;
    return NextResponse.json({ error: { code: status === 413 ? "file_too_large" : "unsupported_media_type", message: validationError } }, { status });
  }

  let blob: Awaited<ReturnType<typeof put>> | null = null;
  try {
    blob = await put(`newsroom/${crypto.randomUUID()}-${safeUploadFilename(file.name)}`, file, { access: "public", addRandomSuffix: false });
    let assetId: string | null = null;
    if (hasDatabase()) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const [asset] = await getDb().insert(mediaAssets).values({ blobUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type, size: file.size, extension: file.name.split(".").at(-1)?.toLowerCase(), sha256: createHash("sha256").update(bytes).digest("hex"), uploadedById: viewer.databaseId ?? null, uploadedBySnapshot: { clerkId: viewer.id, name: viewer.name } }).returning({ id: mediaAssets.id });
      assetId = asset.id;
    }
    return NextResponse.json({ data: { id: assetId, url: blob.url, pathname: blob.pathname, contentType: blob.contentType }, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    if (blob) await del(blob.url).catch(() => undefined);
    console.error("Story image upload failed", error);
    return NextResponse.json({ error: { code: "upload_failed", message: "The image could not be uploaded. Please try again." } }, { status: 500 });
  }
}

const patchInput = z.object({
  id: z.uuid(),
  altText: z.string().trim().max(500).nullable().optional(),
  credit: z.string().trim().max(300).nullable().optional(),
  copyright: z.string().trim().max(300).nullable().optional(),
  license: z.string().trim().max(300).nullable().optional(),
  visibility: z.enum(["public", "private", "internal"]).optional(),
  action: z.enum(["update", "soft_delete", "restore"]).default("update"),
});

export async function PATCH(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const parsed = patchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !hasDatabase()) return NextResponse.json({ error: { code: "invalid_request", message: "Check the media update" } }, { status: 400 });
  const { id, action, ...metadata } = parsed.data;
  const [record] = await getDb().update(mediaAssets).set({ ...metadata, deletedAt: action === "soft_delete" ? new Date() : action === "restore" ? null : undefined, updatedAt: new Date() }).where(eq(mediaAssets.id, id)).returning();
  if (!record) return NextResponse.json({ error: { code: "not_found", message: "Media asset not found" } }, { status: 404 });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: `media.${action}`, targetType: "media_asset", targetId: record.id, metadata: { filename: record.filename } });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}

export async function DELETE(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required for permanent deletion" } }, { status: 403 });
  const id = z.uuid().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success || !hasDatabase()) return NextResponse.json({ error: { code: "invalid_request", message: "A valid asset ID is required" } }, { status: 400 });
  const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, id.data)).limit(1);
  if (!asset) return NextResponse.json({ error: { code: "not_found", message: "Media asset not found" } }, { status: 404 });
  const [usage] = await getDb().select({ value: count() }).from(mediaAssetUsages).where(eq(mediaAssetUsages.assetId, asset.id));
  if (Number(usage?.value ?? 0) > 0) return NextResponse.json({ error: { code: "asset_in_use", message: "Referenced media cannot be permanently deleted. Replace or remove every usage first." } }, { status: 409 });
  if (!asset.deletedAt) return NextResponse.json({ error: { code: "soft_delete_required", message: "Move the asset to Trash before permanent deletion" } }, { status: 409 });
  await del(asset.blobUrl);
  await getDb().delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: "media.permanently_deleted", targetType: "media_asset", targetId: asset.id, reason: "Confirmed permanent deletion from Studio", metadata: { filename: asset.filename, pathname: asset.pathname } });
  return NextResponse.json({ data: { id: asset.id, deleted: true }, meta: { apiVersion: "1" } });
}
