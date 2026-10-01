import { and, asc, ilike, isNull, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canUseMagEngine } from "@/lib/mag-engine";
import { getSiteConfiguration } from "@/lib/site-settings";

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer || !canUseMagEngine(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "MagEngine access is restricted" } }, { status: 403 });
  if (!(await getSiteConfiguration()).studio.modules.magEngine) return NextResponse.json({ error: { code: "module_disabled", message: "MagEngine is disabled" } }, { status: 404 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is unavailable" } }, { status: 503 });
  const assets = await getDb().select({ id: mediaAssets.id, filename: mediaAssets.filename, blobUrl: mediaAssets.blobUrl, altText: mediaAssets.altText })
    .from(mediaAssets)
    .where(and(ilike(mediaAssets.mimeType, "image/%"), eq(mediaAssets.visibility, "public"), isNull(mediaAssets.deletedAt)))
    .orderBy(asc(mediaAssets.filename))
    .limit(500);
  return NextResponse.json({ data: assets, meta: { apiVersion: "1" } }, { headers: { "cache-control": "private, no-store" } });
}
