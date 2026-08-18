import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";

const allowedContentTypes = ["video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "text/vtt"];

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) return Response.json({ error: { code: "forbidden", message: "Producer, editor or administrator access is required" } }, { status: 403 });
  if (!token) return Response.json({ error: { code: "service_not_configured", message: "Private Vercel Blob storage is required" } }, { status: 503 });
  if (!hasDatabase()) return Response.json({ error: { code: "service_not_configured", message: "Postgres is required before private media can be uploaded" } }, { status: 503 });
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body) return Response.json({ error: { code: "invalid_request", message: "Upload request is invalid" } }, { status: 400 });
  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = JSON.parse(clientPayload || "{}") as { filename?: string; sha256?: string };
        return { allowedContentTypes, maximumSizeInBytes: 2 * 1024 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify({ filename: parsed.filename || pathname.split("/").at(-1) || "preview-media", sha256: parsed.sha256 || null, clerkId: viewer.id, name: viewer.name, databaseId: viewer.databaseId || null }) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!hasDatabase()) return;
        const details = JSON.parse(tokenPayload || "{}") as { filename: string; sha256: string | null; clerkId: string; name: string; databaseId: string | null };
        const metadata = await head(blob.pathname, { token });
        await getDb().insert(mediaAssets).values({
          blobUrl: blob.url,
          pathname: blob.pathname,
          filename: details.filename,
          mimeType: blob.contentType || "application/octet-stream",
          size: metadata.size,
          extension: details.filename.split(".").at(-1)?.toLowerCase(),
          sha256: details.sha256,
          source: "courier-cut-private",
          visibility: "private",
          uploadedById: details.databaseId,
          uploadedBySnapshot: { clerkId: details.clerkId, name: details.name },
          processingStatus: "uploaded",
          metadata: { privateStore: true },
        }).onConflictDoNothing();
      },
    });
    return Response.json(result);
  } catch (error) {
    console.error("Private preview upload failed", error);
    return Response.json({ error: { code: "upload_failed", message: "Private upload could not be completed" } }, { status: 400 });
  }
}
