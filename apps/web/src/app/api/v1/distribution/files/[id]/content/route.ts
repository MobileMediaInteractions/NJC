import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  getAuthorizedDistributionFile,
  getDistributionIdentity,
  writeDistributionAudit,
} from "@/lib/distribution";
import { getPrivateBlobToken } from "@/lib/blob-storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getDistributionIdentity();
  const token = getPrivateBlobToken();
  if (!identity || !token) {
    return NextResponse.json(
      { error: { code: "not_found", message: "File not found" } },
      { status: 404 },
    );
  }
  const file = await getAuthorizedDistributionFile(
    identity.clerkId,
    (await context.params).id,
  );
  if (!file) {
    return NextResponse.json(
      { error: { code: "not_found", message: "File not found" } },
      { status: 404 },
    );
  }

  const range = request.headers.get("range");
  const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
  const blob = await get(file.pathname, {
    access: "private",
    token,
    ifNoneMatch,
    headers: range ? { Range: range } : undefined,
  });
  if (!blob) {
    return NextResponse.json(
      { error: { code: "not_found", message: "File not found" } },
      { status: 404 },
    );
  }
  if (blob.statusCode === 304) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: blob.blob.etag,
        "Cache-Control": "private, no-store",
      },
    });
  }

  await writeDistributionAudit({
    request,
    actorClerkId: identity.clerkId,
    action: range ? "file.range_viewed" : "file.viewed",
    targetType: "distribution_file",
    targetId: file.id,
    metadata: { mimeType: file.mimeType, packageId: file.packageSlug },
  }).catch((error) =>
    console.error("Distribution view audit failed", error),
  );

  const upstreamStatus = (blob as { statusCode: number }).statusCode;
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "Content-Disposition": `inline; filename="${safeHeaderFilename(file.filename)}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Accept-Ranges": blob.headers.get("accept-ranges") ?? "bytes",
    ETag: blob.blob.etag,
  });
  for (const name of ["content-range", "content-length", "last-modified"]) {
    const value = blob.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(blob.stream, {
    status: upstreamStatus === 206 ? 206 : 200,
    headers,
  });
}

function safeHeaderFilename(value: string) {
  return value.replaceAll('"', "").replaceAll("\r", "").replaceAll("\n", "");
}
