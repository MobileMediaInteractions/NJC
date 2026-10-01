import { and, eq, ilike, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, studioMagazines } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canUseMagEngine, magazineUpdateInput } from "@/lib/mag-engine";
import { getSiteConfiguration } from "@/lib/site-settings";
import { writeApiAudit } from "@/lib/api-keys";

const idSchema = z.uuid();

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || !canUseMagEngine(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "MagEngine access is restricted" } }, { status: 403 });
  if (!(await getSiteConfiguration()).studio.modules.magEngine) return NextResponse.json({ error: { code: "module_disabled", message: "MagEngine is disabled" } }, { status: 404 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is unavailable" } }, { status: 503 });
  const id = idSchema.safeParse((await context.params).id);
  const parsed = magazineUpdateInput.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the magazine details and pages" } }, { status: 400 });
  const [existing] = await getDb().select().from(studioMagazines).where(eq(studioMagazines.id, id.data)).limit(1);
  if (!existing) return NextResponse.json({ error: { code: "not_found", message: "Magazine project not found" } }, { status: 404 });
  const value = parsed.data;
  if (existing.sourceKind === "composer") {
    const imageIds = [...new Set(value.pages.flatMap((page) => page.imageAssetId ? [page.imageAssetId] : []))];
    if (imageIds.length) {
      const allowed = await getDb().select({ id: mediaAssets.id }).from(mediaAssets).where(and(inArray(mediaAssets.id, imageIds), eq(mediaAssets.visibility, "public"), ilike(mediaAssets.mimeType, "image/%"), isNull(mediaAssets.deletedAt)));
      if (allowed.length !== imageIds.length) return NextResponse.json({ error: { code: "invalid_image", message: "Choose images from the active public newsroom media library" } }, { status: 400 });
    }
  }
  const [issue] = await getDb().update(studioMagazines).set({
    title: value.title,
    description: value.description,
    pages: existing.sourceKind === "composer" ? value.pages : existing.pages,
    pageCount: existing.sourceKind === "composer" ? value.pages.length : existing.pageCount,
    status: value.status,
    publishedAt: value.status === "approved" ? existing.publishedAt ?? new Date() : null,
    updatedByClerkId: viewer.id,
    updatedAt: new Date(),
  }).where(eq(studioMagazines.id, existing.id)).returning();
  await writeApiAudit({ actorClerkId: viewer.id, event: "mag_engine.issue_updated", request, metadata: { issueId: existing.id, from: existing.status, to: value.status, sourceKind: existing.sourceKind } });
  return NextResponse.json({ data: issue, meta: { apiVersion: "1" } });
}
