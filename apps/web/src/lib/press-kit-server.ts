import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  mediaAssets,
  pressAssets,
  pressKitAuditLogs,
  pressKitRequestAssets,
  pressKitRequests,
} from "@harborline/backend/schema";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import {
  builtInPressAssets,
  generatedPressDocument,
  type PressUsageClassification,
} from "@/lib/press-kit-policy";
import { getSiteConfiguration } from "@/lib/site-settings";

export type PressCatalogAsset = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  sourceKind: string;
  sourcePath: string | null;
  mediaAssetId: string | null;
  mimeType: string;
  version: string;
  checksumSha256: string | null;
  visibility: string;
  approvedUsageTypes: PressUsageClassification[];
  restrictions: string[];
  attribution: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
};

export async function isPressPortalEnabled() {
  return (await getSiteConfiguration()).features.pressPortal;
}

const tokenPepper = () => {
  const configured = process.env.PRESS_KIT_TOKEN_PEPPER?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("PRESS_KIT_TOKEN_PEPPER is required in production");
  return "local-press-kit-token-pepper";
};

export function issuePressAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPressToken(token) };
}

export function hashPressToken(token: string) {
  return createHmac("sha256", tokenPepper()).update(token).digest("hex");
}

export function pressTokensEqual(candidate: string, storedHash: string | null) {
  if (!candidate || !storedHash) return false;
  const candidateHash = Buffer.from(hashPressToken(candidate), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return candidateHash.length === expected.length && timingSafeEqual(candidateHash, expected);
}

export function pressRequestToken(request: Request) {
  const direct = request.headers.get("x-press-request-token")?.trim();
  if (direct) return direct;
  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return null;
}

export async function ensurePressAssetCatalog() {
  if (!hasDatabase()) return;
  const db = getDb();
  for (const asset of builtInPressAssets) {
    await db.insert(pressAssets).values({
      ...asset,
      sourcePath: asset.sourcePath,
    }).onConflictDoUpdate({
      target: pressAssets.slug,
      set: {
        title: asset.title,
        description: asset.description,
        category: asset.category,
        sourceKind: asset.sourceKind,
        sourcePath: asset.sourcePath,
        mimeType: asset.mimeType,
        version: asset.version,
        visibility: asset.visibility,
        approvedUsageTypes: asset.approvedUsageTypes,
        restrictions: asset.restrictions,
        attribution: asset.attribution,
        metadata: asset.metadata,
        updatedByClerkId: "system",
        updatedAt: new Date(),
      },
    });
  }
}

export async function getPressAssetCatalog(options: { includeInactive?: boolean } = {}) {
  if (!hasDatabase()) return builtInPressAssets as PressCatalogAsset[];
  await ensurePressAssetCatalog();
  const rows = await getDb()
    .select()
    .from(pressAssets)
    .where(options.includeInactive ? undefined : eq(pressAssets.active, true))
    .orderBy(asc(pressAssets.category), asc(pressAssets.title));
  return rows as PressCatalogAsset[];
}

export async function getPressAssetsByIds(ids: string[]) {
  if (!ids.length) return [];
  const catalog = await getPressAssetCatalog({ includeInactive: true });
  const wanted = new Set(ids);
  return catalog.filter((asset) => wanted.has(asset.id));
}

export async function getAuthorizedPressRequest(request: Request, id: string) {
  if (!hasDatabase()) return null;
  const [record] = await getDb()
    .select()
    .from(pressKitRequests)
    .where(eq(pressKitRequests.id, id))
    .limit(1);
  const token = pressRequestToken(request);
  if (!record || !token || !pressTokensEqual(token, record.accessTokenHash)) return null;
  return record;
}

export function pressRequestIpHash(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", tokenPepper()).update(address).digest("hex");
}

export async function writePressAudit(input: {
  request: Request;
  requestId?: string | null;
  actorType: "requester" | "staff" | "system" | "ai";
  actorId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  if (!hasDatabase()) return;
  await getDb().insert(pressKitAuditLogs).values({
    requestId: input.requestId ?? null,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
    ipHash: pressRequestIpHash(input.request),
  });
}

export async function replacePressRequestAssetDecisions(input: {
  requestId: string;
  requestedIds: string[];
  approvedIds: string[];
  rejectedIds: string[];
  actorId?: string | null;
  reasonById?: Record<string, string>;
}) {
  const db = getDb();
  await db.delete(pressKitRequestAssets).where(eq(pressKitRequestAssets.requestId, input.requestId));
  if (!input.requestedIds.length) return;
  const approved = new Set(input.approvedIds);
  const rejected = new Set(input.rejectedIds);
  await db.insert(pressKitRequestAssets).values(input.requestedIds.map((assetId) => ({
    requestId: input.requestId,
    assetId,
    decision: approved.has(assetId) ? "approved" : rejected.has(assetId) ? "rejected" : "requested",
    reason: input.reasonById?.[assetId] ?? null,
    decidedByClerkId: approved.has(assetId) || rejected.has(assetId) ? input.actorId ?? "system" : null,
    decidedAt: approved.has(assetId) || rejected.has(assetId) ? new Date() : null,
    updatedAt: new Date(),
  })));
}

export async function readPressAsset(asset: PressCatalogAsset) {
  if (asset.sourceKind === "generated_document") {
    return Buffer.from(generatedPressDocument(asset.sourcePath ?? ""), "utf8");
  }
  if (asset.sourceKind === "bundled_public") {
    if (!asset.sourcePath || asset.sourcePath.includes("..") || path.isAbsolute(asset.sourcePath)) {
      throw new Error("Invalid bundled press asset path");
    }
    return readFile(path.join(process.cwd(), "public", "assets", asset.sourcePath));
  }
  if (asset.sourceKind === "media_asset" && asset.mediaAssetId && hasDatabase()) {
    const [media] = await getDb().select().from(mediaAssets).where(and(
      eq(mediaAssets.id, asset.mediaAssetId),
      isNull(mediaAssets.deletedAt),
    )).limit(1);
    if (!media || media.processingStatus !== "ready") throw new Error("Press media is unavailable");
    if (media.visibility === "private") {
      const token = getPrivateBlobToken();
      if (!token) throw new Error("Private Blob storage is unavailable");
      const blob = await get(media.pathname, { access: "private", token });
      if (!blob || blob.statusCode !== 200) throw new Error("Private press media is unavailable");
      return Buffer.from(await new Response(blob.stream).arrayBuffer());
    }
    const response = await fetch(media.blobUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Press media could not be retrieved");
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error("Unsupported press asset source");
}

export function pressAssetDestination(asset: PressCatalogAsset) {
  const configured = typeof asset.metadata.destination === "string"
    ? asset.metadata.destination
    : `${asset.category}/${asset.slug}`;
  const safe = configured
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._ -]/g, "-").replace(/^\.+$/, "file"))
    .filter(Boolean)
    .join("/");
  if (!safe || safe.includes("..") || safe.startsWith("/")) throw new Error("Invalid press package destination");
  return safe;
}

export async function checksumPressAsset(asset: PressCatalogAsset, body: Buffer) {
  return asset.checksumSha256 || createHash("sha256").update(body).digest("hex");
}

export async function requestedPressAssets(requestId: string) {
  if (!hasDatabase()) return [];
  return getDb().select({ link: pressKitRequestAssets, asset: pressAssets })
    .from(pressKitRequestAssets)
    .innerJoin(pressAssets, eq(pressAssets.id, pressKitRequestAssets.assetId))
    .where(eq(pressKitRequestAssets.requestId, requestId));
}

export async function allowedPressAssetIds(ids: string[]) {
  if (!hasDatabase() || !ids.length) return [];
  const rows = await getDb().select({ id: pressAssets.id }).from(pressAssets).where(inArray(pressAssets.id, ids));
  return rows.map((row) => row.id);
}
