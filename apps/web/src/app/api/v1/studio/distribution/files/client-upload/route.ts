import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  distributionFiles,
  distributionPackageItems,
  distributionPackages,
} from "@harborline/backend/schema";
import { getDistributionManager, writeDistributionAudit } from "@/lib/distribution";
import {
  distributionUploadMaxBytes,
  distributionUploadTypes,
} from "@/lib/distribution-input";

export async function POST(request: Request) {
  const manager = await getDistributionManager();
  if (!manager || !hasDatabase()) {
    return Response.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  if (!process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: { code: "service_not_configured", message: "Private media storage is unavailable" } },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | HandleUploadBody
    | null;
  if (!body) {
    return Response.json(
      { error: { code: "invalid_request", message: "Upload request is invalid" } },
      { status: 400 },
    );
  }
  try {
    const result = await handleUpload({
      body,
      request,
      token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = JSON.parse(clientPayload || "{}") as {
          packageId?: string;
          filename?: string;
          title?: string;
          description?: string;
        };
        if (!parsed.packageId) throw new Error("A package is required");
        const [target] = await getDb()
          .select({ id: distributionPackages.id })
          .from(distributionPackages)
          .where(eq(distributionPackages.id, parsed.packageId))
          .limit(1);
        if (!target) throw new Error("Package not found");
        const filename = safeName(
          parsed.filename || pathname.split("/").at(-1) || "file",
        );
        return {
          allowedContentTypes: [...distributionUploadTypes],
          maximumSizeInBytes: distributionUploadMaxBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            packageId: target.id,
            filename,
            title: (parsed.title || filename).slice(0, 200),
            description: (parsed.description || "").slice(0, 2_000),
            clerkId: manager.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const details = JSON.parse(tokenPayload || "{}") as {
          packageId: string;
          filename: string;
          title: string;
          description: string;
          clerkId: string;
        };
        const metadata = await head(blob.pathname, {
          token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
        });
        const [inserted] = await getDb()
          .insert(distributionFiles)
          .values({
            pathname: blob.pathname,
            filename: details.filename,
            mimeType: blob.contentType || "application/octet-stream",
            size: metadata.size,
            processingStatus: "ready",
            uploadedByClerkId: details.clerkId,
          })
          .onConflictDoNothing({ target: distributionFiles.pathname })
          .returning();
        const file = inserted ?? (
          await getDb()
            .select()
            .from(distributionFiles)
            .where(eq(distributionFiles.pathname, blob.pathname))
            .limit(1)
        )[0];
        if (!file) throw new Error("Uploaded file metadata was not persisted");
        await getDb().insert(distributionPackageItems).values({
          packageId: details.packageId,
          fileId: file.id,
          title: details.title,
          description: details.description,
        }).onConflictDoNothing();
        if (inserted) {
          await writeDistributionAudit({
            actorClerkId: details.clerkId,
            action: "file.uploaded",
            targetType: "distribution_file",
            targetId: file.id,
            metadata: {
              packageId: details.packageId,
              mimeType: file.mimeType,
              size: file.size,
            },
          });
        }
      },
    });
    return Response.json(result);
  } catch (error) {
    console.error("Distribution upload failed", error);
    return Response.json(
      {
        error: {
          code: "upload_failed",
          message:
            error instanceof Error
              ? error.message
              : "The private upload could not be prepared",
        },
      },
      { status: 400 },
    );
  }
}

function safeName(value: string) {
  return (
    value
      .split(/[\\/]/)
      .at(-1)
      ?.normalize("NFKD")
      .replace(/[^a-zA-Z0-9._ -]+/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 160) || "file"
  );
}
