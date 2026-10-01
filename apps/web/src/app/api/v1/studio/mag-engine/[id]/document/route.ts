import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, studioMagazines } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import { canUseMagEngine } from "@/lib/mag-engine";
import { getSiteConfiguration } from "@/lib/site-settings";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  const token = getPrivateBlobToken();
  const id = z.uuid().safeParse((await context.params).id);
  if (!viewer || !canUseMagEngine(viewer.role) || !hasDatabase() || !token || !id.success || !(await getSiteConfiguration()).studio.modules.magEngine) return NextResponse.json({ error: { code: "not_found", message: "Magazine file not found" } }, { status: 404 });
  const [row] = await getDb().select({ issue: studioMagazines, asset: mediaAssets })
    .from(studioMagazines)
    .innerJoin(mediaAssets, eq(studioMagazines.sourceAssetId, mediaAssets.id))
    .where(and(eq(studioMagazines.id, id.data), eq(studioMagazines.sourceKind, "bookwright-pdf"), eq(mediaAssets.source, "studio-mag-engine"), eq(mediaAssets.visibility, "private")))
    .limit(1);
  if (!row || row.asset.deletedAt) return NextResponse.json({ error: { code: "not_found", message: "Magazine file not found" } }, { status: 404 });
  const range = request.headers.get("range");
  const blob = await get(row.asset.pathname, { access: "private", token, headers: range ? { Range: range } : undefined });
  if (!blob) return NextResponse.json({ error: { code: "not_found", message: "Magazine file not found" } }, { status: 404 });
  const headers = new Headers({ "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff", "Accept-Ranges": blob.headers.get("accept-ranges") ?? "bytes" });
  for (const name of ["content-range", "content-length", "etag", "last-modified"]) { const value = blob.headers.get(name); if (value) headers.set(name, value); }
  const status = (blob as { statusCode: number }).statusCode;
  return new Response(blob.stream, { status: status === 206 ? 206 : 200, headers });
}
