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
  if (!file?.downloadAllowed) {
    return NextResponse.json(
      { error: { code: "not_found", message: "File not found" } },
      { status: 404 },
    );
  }
  const blob = await get(file.pathname, { access: "private", token });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json(
      { error: { code: "not_found", message: "File not found" } },
      { status: 404 },
    );
  }
  await writeDistributionAudit({
    request,
    actorClerkId: identity.clerkId,
    action: "file.downloaded",
    targetType: "distribution_file",
    targetId: file.id,
    metadata: { mimeType: file.mimeType, size: file.size },
  });
  const filename = file.filename
    .replaceAll('"', "")
    .replaceAll("\r", "")
    .replaceAll("\n", "");
  return new Response(blob.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
