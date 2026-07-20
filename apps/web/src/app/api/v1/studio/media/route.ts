import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { safeUploadFilename, validateStoryImage } from "@/lib/media-upload";

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
      const [asset] = await getDb().insert(mediaAssets).values({ blobUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type, size: file.size, uploadedById: viewer.databaseId ?? null }).returning({ id: mediaAssets.id });
      assetId = asset.id;
    }
    return NextResponse.json({ data: { id: assetId, url: blob.url, pathname: blob.pathname, contentType: blob.contentType }, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    if (blob) await del(blob.url).catch(() => undefined);
    console.error("Story image upload failed", error);
    return NextResponse.json({ error: { code: "upload_failed", message: "The image could not be uploaded. Please try again." } }, { status: 500 });
  }
}
