import { desc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, mediaAssetUsages, premiumPlatformIntros } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writePremiumAudit } from "@/lib/njc-plus";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), title: z.string().trim().min(3).max(120), mediaAssetId: z.uuid(), durationMs: z.number().int().min(250).max(120_000), blackGapMs: z.number().int().min(0).max(10_000).default(2500) }),
  z.object({ action: z.literal("activate"), id: z.uuid() }),
  z.object({ action: z.literal("archive"), id: z.uuid() }),
]);

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1" } });
  const rows = await getDb().select({ intro: premiumPlatformIntros, media: mediaAssets })
    .from(premiumPlatformIntros).innerJoin(mediaAssets, eq(mediaAssets.id, premiumPlatformIntros.mediaAssetId))
    .orderBy(desc(premiumPlatformIntros.updatedAt));
  return NextResponse.json({ data: rows.map((row) => ({ ...row.intro, media: row.media })), meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Producer, editor or administrator access is required" } }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the platform intro settings", details: parsed.error.flatten() } }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const value = parsed.data;
  if (value.action === "create") {
    const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, value.mediaAssetId)).limit(1);
    if (!asset || !asset.mimeType.startsWith("video/") || asset.deletedAt || asset.visibility !== "public") return NextResponse.json({ error: { code: "invalid_asset", message: "Choose an active public video asset for the global intro" } }, { status: 400 });
    const durationMs = asset.durationMs && asset.durationMs > 0 ? asset.durationMs : value.durationMs;
    const [record] = await getDb().insert(premiumPlatformIntros).values({
      title: value.title,
      mediaAssetId: value.mediaAssetId,
      durationMs,
      blackGapMs: value.blackGapMs,
      createdByClerkId: viewer.id,
    }).returning();
    if (!asset.durationMs) await getDb().update(mediaAssets).set({ durationMs, updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
    if (record) await getDb().insert(mediaAssetUsages).values({ assetId: value.mediaAssetId, product: "njc_plus", ownerType: "platform_intro", ownerId: record.id, field: "media" }).onConflictDoNothing();
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: "platform_intro.created", targetType: "platform_intro", targetId: record!.id, metadata: { mediaAssetId: value.mediaAssetId, durationMs } });
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: 201 });
  }
  const [target] = await getDb().select().from(premiumPlatformIntros).where(eq(premiumPlatformIntros.id, value.id)).limit(1);
  if (!target) return NextResponse.json({ error: { code: "not_found", message: "Platform intro not found" } }, { status: 404 });
  const now = new Date();
  const record = await getDb().transaction(async (tx) => {
    if (value.action === "activate") {
      await tx.update(premiumPlatformIntros).set({ status: "inactive", updatedAt: now }).where(ne(premiumPlatformIntros.id, target.id));
      const [active] = await tx.update(premiumPlatformIntros).set({ status: "active", activatedAt: now, activatedByClerkId: viewer.id, archivedAt: null, updatedAt: now }).where(eq(premiumPlatformIntros.id, target.id)).returning();
      return active;
    }
    const [archived] = await tx.update(premiumPlatformIntros).set({ status: "archived", archivedAt: now, updatedAt: now }).where(eq(premiumPlatformIntros.id, target.id)).returning();
    return archived;
  });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: `platform_intro.${value.action}d`, targetType: "platform_intro", targetId: target.id });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
