import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { eq } from "drizzle-orm";
import { getAccessiblePreviewContentBySlug } from "@/lib/njc-plus-preview";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!(await isNjcPlusFeatureEnabled("njc_plus_preview_club"))) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const preview = await getAccessiblePreviewContentBySlug((await context.params).slug);
  if (!preview || !preview.content.mediaAssetId || !hasDatabase()) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, preview.content.mediaAssetId)).limit(1);
  if (!asset || asset.deletedAt) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const range = request.headers.get("range");
  if (asset.visibility === "private" || asset.visibility === "internal") {
    const token = getPrivateBlobToken();
    if (!token) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
    const blob = await get(asset.pathname, { access: "private", token, headers: range ? { Range: range } : undefined });
    if (!blob) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
    const headers = new Headers({ "Content-Type": asset.mimeType, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Accept-Ranges": blob.headers.get("accept-ranges") ?? "bytes" });
    for (const name of ["content-range", "content-length", "etag", "last-modified"]) { const value = blob.headers.get(name); if (value) headers.set(name, value); }
    const statusCode = (blob as { statusCode: number }).statusCode;
    return new Response(blob.stream, { status: statusCode === 206 ? 206 : 200, headers });
  }
  const upstream = await fetch(asset.blobUrl, { headers: range ? { Range: range } : undefined, cache: "no-store" });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const headers = new Headers({ "Content-Type": asset.mimeType, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes" });
  for (const name of ["content-range", "content-length", "etag", "last-modified"]) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers });
}
