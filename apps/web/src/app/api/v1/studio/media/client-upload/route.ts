import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";

const allowedContentTypes = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg",
  "text/vtt", "application/pdf",
];

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return Response.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: { code: "service_not_configured", message: "Connect Vercel Blob before uploading media" } }, { status: 503 });
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body) return Response.json({ error: { code: "invalid_request", message: "Upload request is invalid" } }, { status: 400 });
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = JSON.parse(clientPayload || "{}") as { filename?: string; sha256?: string; source?: string };
        return {
          allowedContentTypes,
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ filename: parsed.filename || pathname.split("/").at(-1) || "upload", sha256: parsed.sha256 || null, source: parsed.source || "media-library", clerkId: viewer.id, name: viewer.name, databaseId: viewer.databaseId || null }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!hasDatabase()) return;
        const metadata = JSON.parse(tokenPayload || "{}") as { filename: string; sha256: string | null; source: string; clerkId: string; name: string; databaseId: string | null };
        const extension = metadata.filename.includes(".") ? metadata.filename.split(".").at(-1)?.toLowerCase() : null;
        await getDb().insert(mediaAssets).values({
          blobUrl: blob.url,
          pathname: blob.pathname,
          filename: metadata.filename,
          mimeType: blob.contentType || "application/octet-stream",
          size: (blob as { size?: number }).size ?? 0,
          extension,
          sha256: metadata.sha256,
          source: metadata.source,
          uploadedById: metadata.databaseId,
          uploadedBySnapshot: { clerkId: metadata.clerkId, name: metadata.name },
          processingStatus: blob.contentType?.startsWith("video/") || blob.contentType?.startsWith("audio/") ? "uploaded" : "ready",
          metadata: { downloadUrl: blob.downloadUrl },
        }).onConflictDoNothing();
      },
    });
    return Response.json(result);
  } catch (error) {
    console.error("Direct media upload failed", error);
    return Response.json({ error: { code: "upload_failed", message: "The direct upload could not be prepared" } }, { status: 400 });
  }
}
