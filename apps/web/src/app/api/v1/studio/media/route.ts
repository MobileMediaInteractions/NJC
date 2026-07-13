import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Vercel Blob before uploading media" } }, { status: 503 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: { code: "invalid_request", message: "A file is required" } }, { status: 400 });
  if (file.size > 4_000_000) return NextResponse.json({ error: { code: "file_too_large", message: "Server uploads are limited to 4 MB; use the client upload flow for video" } }, { status: 413 });
  const blob = await put(`newsroom/${crypto.randomUUID()}-${file.name}`, file, { access: "public", addRandomSuffix: false });
  let assetId: string | null = null;
  if (hasDatabase()) {
    const [asset] = await getDb().insert(mediaAssets).values({ blobUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type || "application/octet-stream", size: file.size }).returning({ id: mediaAssets.id });
    assetId = asset.id;
  }
  return NextResponse.json({ data: { id: assetId, url: blob.url, pathname: blob.pathname, contentType: blob.contentType }, meta: { apiVersion: "1" } }, { status: 201 });
}
