import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import { canUseMagEngine } from "@/lib/mag-engine";
import { getSiteConfiguration } from "@/lib/site-settings";
import { MAX_BOOKWRIGHT_PDF_BYTES } from "@/lib/mag-engine";

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  const token = getPrivateBlobToken();
  if (!viewer || !canUseMagEngine(viewer.role)) return Response.json({ error: { code: "forbidden", message: "Editor, producer or administrator access is required" } }, { status: 403 });
  if (!(await getSiteConfiguration()).studio.modules.magEngine) return Response.json({ error: { code: "module_disabled", message: "MagEngine is disabled" } }, { status: 404 });
  if (!viewer.databaseId || !hasDatabase() || !token) return Response.json({ error: { code: "service_not_configured", message: "A synchronized newsroom account, Postgres and private Blob storage are required" } }, { status: 503 });
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body) return Response.json({ error: { code: "invalid_request", message: "Upload request is invalid" } }, { status: 400 });
  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("mag-engine/")) throw new Error("Magazine upload path is invalid");
        const details = JSON.parse(clientPayload || "{}") as { filename?: string };
        if (!details.filename?.toLowerCase().endsWith(".pdf")) throw new Error("Only PDF magazine exports can be imported");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_BOOKWRIGHT_PDF_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ filename: details.filename.slice(0, 240), clerkId: viewer.id, databaseId: viewer.databaseId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const details = JSON.parse(tokenPayload || "{}") as { filename: string; clerkId: string; databaseId: string };
        if (blob.contentType !== "application/pdf" || !details.clerkId || details.clerkId !== viewer.id || details.databaseId !== viewer.databaseId) throw new Error("Magazine upload failed identity validation");
        const metadata = await head(blob.pathname, { token });
        await getDb().insert(mediaAssets).values({
          blobUrl: blob.url,
          pathname: blob.pathname,
          filename: details.filename,
          mimeType: "application/pdf",
          size: metadata.size,
          extension: "pdf",
          source: "studio-mag-engine",
          visibility: "private",
          uploadedById: viewer.databaseId,
          uploadedBySnapshot: { clerkId: viewer.id, name: viewer.name },
          processingStatus: "ready",
          metadata: { privateStore: true, importedByMagEngine: true },
        }).onConflictDoNothing();
      },
    });
    return Response.json(result);
  } catch (error) {
    console.error("MagEngine PDF upload failed", error);
    return Response.json({ error: { code: "upload_failed", message: "The private PDF could not be prepared" } }, { status: 400 });
  }
}
