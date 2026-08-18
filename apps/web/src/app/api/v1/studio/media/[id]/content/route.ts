import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  const token = getPrivateBlobToken();
  const id = z.uuid().safeParse((await context.params).id);
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role) || !token || !hasDatabase() || !id.success) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, id.data)).limit(1);
  if (!asset || asset.deletedAt || !["private", "internal"].includes(asset.visibility)) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const range = request.headers.get("range");
  const blob = await get(asset.pathname, { access: "private", token, headers: range ? { Range: range } : undefined });
  if (!blob) return NextResponse.json({ error: { code: "not_found", message: "Media not found" } }, { status: 404 });
  const headers = new Headers({ "Content-Type": asset.mimeType, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Accept-Ranges": blob.headers.get("accept-ranges") ?? "bytes" });
  for (const name of ["content-range", "content-length", "etag", "last-modified"]) { const value = blob.headers.get(name); if (value) headers.set(name, value); }
  const statusCode = (blob as { statusCode: number }).statusCode;
  return new Response(blob.stream, { status: statusCode === 206 ? 206 : 200, headers });
}
