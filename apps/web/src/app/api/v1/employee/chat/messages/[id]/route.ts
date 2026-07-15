import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatMessages } from "@harborline/backend/schema";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid, sanitizeEmployeeMessage } from "@/lib/employee-chat";

const editInput = z.object({ body: z.string().max(8000).optional(), pinned: z.boolean().optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Message access is required" } }, { status: 403 });
  const { id } = await context.params;
  if (!isValidEmployeeUuid(id)) return NextResponse.json({ error: { code: "not_found", message: "Message not found" } }, { status: 404 });
  const parsed = editInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.body === undefined && parsed.data.pinned === undefined)) return NextResponse.json({ error: { code: "invalid_request", message: "Provide a supported message change" } }, { status: 400 });
  const db = getDb();
  const [message] = await db.select().from(employeeChatMessages).where(eq(employeeChatMessages.id, id)).limit(1);
  if (!message || !(await getAuthorizedEmployeeChannel(viewer, message.channelId, "write"))) return NextResponse.json({ error: { code: "not_found", message: "Message not found" } }, { status: 404 });
  const moderates = viewer.capabilities.includes("chat:moderate");
  if (parsed.data.body !== undefined && message.authorClerkId !== viewer.id && !moderates) return NextResponse.json({ error: { code: "forbidden", message: "Only the author or a moderator can edit this message" } }, { status: 403 });
  if (parsed.data.pinned !== undefined && !viewer.capabilities.includes("chat:manage")) return NextResponse.json({ error: { code: "forbidden", message: "Channel-management permission is required" } }, { status: 403 });
  const body = parsed.data.body === undefined ? undefined : sanitizeEmployeeMessage(parsed.data.body);
  if (parsed.data.body !== undefined && !body) return NextResponse.json({ error: { code: "invalid_request", message: "A message cannot be empty" } }, { status: 400 });
  const [updated] = await db.update(employeeChatMessages).set({ ...(body !== undefined ? { body, editedAt: new Date() } : {}), ...(parsed.data.pinned !== undefined ? { isPinned: parsed.data.pinned } : {}) }).where(eq(employeeChatMessages.id, id)).returning();
  await writeEmployeeAudit(request, viewer, "chat.message.updated", { type: "message", id }, { channelId: message.channelId, changedBody: body !== undefined, changedPin: parsed.data.pinned !== undefined });
  return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Message access is required" } }, { status: 403 });
  const { id } = await context.params;
  if (!isValidEmployeeUuid(id)) return NextResponse.json({ error: { code: "not_found", message: "Message not found" } }, { status: 404 });
  const db = getDb();
  const [message] = await db.select().from(employeeChatMessages).where(eq(employeeChatMessages.id, id)).limit(1);
  if (!message || !(await getAuthorizedEmployeeChannel(viewer, message.channelId, "write"))) return NextResponse.json({ error: { code: "not_found", message: "Message not found" } }, { status: 404 });
  if (message.authorClerkId !== viewer.id && !viewer.capabilities.includes("chat:moderate")) return NextResponse.json({ error: { code: "forbidden", message: "Only the author or a moderator can delete this message" } }, { status: 403 });
  const [updated] = await db.update(employeeChatMessages).set({ body: "", deletedAt: new Date(), deletedByClerkId: viewer.id, mentions: [] }).where(eq(employeeChatMessages.id, id)).returning();
  await writeEmployeeAudit(request, viewer, "chat.message.deleted", { type: "message", id }, { channelId: message.channelId, moderatorAction: message.authorClerkId !== viewer.id });
  return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
}
