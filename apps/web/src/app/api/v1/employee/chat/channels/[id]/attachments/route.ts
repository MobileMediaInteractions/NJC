import { del, put } from "@vercel/blob";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatAttachments } from "@harborline/backend/schema";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid } from "@/lib/employee-chat";
import { validateEmployeeChatAttachment } from "@/lib/employee-chat-attachments";
import { getPrivateBlobToken } from "@/lib/blob-storage";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  const { id } = await context.params;
  const blobToken = getPrivateBlobToken();
  if (!viewer || !hasDatabase() || !blobToken) return NextResponse.json({ error: { code: "service_not_configured", message: "Secure attachments are not configured" } }, { status: 503 });
  if (!isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id, "write"))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const db = getDb();
  const [rate] = await db.select({ count: sql<number>`count(*)::int` }).from(employeeChatAttachments).where(and(eq(employeeChatAttachments.uploaderClerkId, viewer.id), gt(employeeChatAttachments.createdAt, new Date(Date.now() - 60_000))));
  if (rate.count >= 20) return NextResponse.json({ error: { code: "rate_limited", message: "Wait before uploading more attachments" } }, { status: 429, headers: { "Retry-After": "60" } });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const validationError = file instanceof File ? validateEmployeeChatAttachment(file) : "Use a JPEG, PNG, WebP, or PDF file up to 4 MB";
  if (!(file instanceof File) || validationError) return NextResponse.json({ error: { code: "invalid_attachment", message: validationError } }, { status: 400 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "attachment";
  const pathname = `employee-chat/${id}/${crypto.randomUUID()}-${safeName}`;
  const blob = await put(pathname, file, { access: "private", addRandomSuffix: false, token: blobToken });
  let attachment: typeof employeeChatAttachments.$inferSelect;
  try {
    [attachment] = await db.insert(employeeChatAttachments).values({ channelId: id, uploaderClerkId: viewer.id, pathname: blob.pathname, filename: safeName, mimeType: file.type, size: file.size }).returning();
  } catch (error) {
    await del(blob.url, { token: blobToken }).catch(() => undefined);
    throw error;
  }
  await writeEmployeeAudit(request, viewer, "chat.attachment.uploaded", { type: "attachment", id: attachment.id }, { channelId: id, mimeType: file.type, size: file.size });
  return NextResponse.json({ data: attachment, meta: { apiVersion: "1" } }, { status: 201 });
}
