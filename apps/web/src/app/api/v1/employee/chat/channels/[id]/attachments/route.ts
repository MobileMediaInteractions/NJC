import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatAttachments } from "@harborline/backend/schema";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid } from "@/lib/employee-chat";
import { getPrivateBlobToken } from "@/lib/blob-storage";

export const runtime = "nodejs";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  const { id } = await context.params;
  const blobToken = getPrivateBlobToken();
  if (!viewer || !hasDatabase() || !blobToken) return NextResponse.json({ error: { code: "service_not_configured", message: "Secure attachments are not configured" } }, { status: 503 });
  if (!isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id, "write"))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 4_000_000 || !allowedTypes.has(file.type)) return NextResponse.json({ error: { code: "invalid_attachment", message: "Use a JPEG, PNG, WebP, or PDF file up to 4 MB" } }, { status: 400 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "attachment";
  const pathname = `employee-chat/${id}/${crypto.randomUUID()}-${safeName}`;
  const blob = await put(pathname, file, { access: "private", addRandomSuffix: false, token: blobToken });
  const [attachment] = await getDb().insert(employeeChatAttachments).values({ channelId: id, uploaderClerkId: viewer.id, pathname: blob.pathname, filename: safeName, mimeType: file.type, size: file.size }).returning();
  await writeEmployeeAudit(request, viewer, "chat.attachment.uploaded", { type: "attachment", id: attachment.id }, { channelId: id, mimeType: file.type, size: file.size });
  return NextResponse.json({ data: attachment, meta: { apiVersion: "1" } }, { status: 201 });
}
