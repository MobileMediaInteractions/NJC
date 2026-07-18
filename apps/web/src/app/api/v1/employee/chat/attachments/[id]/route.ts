import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatAttachments } from "@harborline/backend/schema";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid } from "@/lib/employee-chat";
import { getPrivateBlobToken } from "@/lib/blob-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  const { id } = await context.params;
  const blobToken = getPrivateBlobToken();
  if (!viewer || !hasDatabase() || !blobToken || !isValidEmployeeUuid(id)) return NextResponse.json({ error: { code: "not_found", message: "Attachment not found" } }, { status: 404 });
  const [attachment] = await getDb().select().from(employeeChatAttachments).where(eq(employeeChatAttachments.id, id)).limit(1);
  if (!attachment || !(await getAuthorizedEmployeeChannel(viewer, attachment.channelId))) return NextResponse.json({ error: { code: "not_found", message: "Attachment not found" } }, { status: 404 });
  const result = await get(attachment.pathname, { access: "private", token: blobToken });
  if (!result || result.statusCode !== 200) return NextResponse.json({ error: { code: "not_found", message: "Attachment not found" } }, { status: 404 });
  return new Response(result.stream, { headers: { "Content-Type": attachment.mimeType, "Content-Disposition": `inline; filename="${attachment.filename.replaceAll('"', '')}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
