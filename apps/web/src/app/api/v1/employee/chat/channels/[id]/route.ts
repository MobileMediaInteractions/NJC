import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatChannels } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { isValidEmployeeUuid } from "@/lib/employee-chat";
import { canArchiveEmployeeChatChannel } from "@/lib/employee-chat-attachments";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("chat:manage");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Channel-management permission is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Chat requires Postgres" } }, { status: 503 });
  const { id } = await context.params;
  if (!isValidEmployeeUuid(id)) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const db = getDb();
  const [channel] = await db.select().from(employeeChatChannels).where(eq(employeeChatChannels.id, id)).limit(1);
  if (!channel || channel.isArchived) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  if (!canArchiveEmployeeChatChannel(channel.kind)) return NextResponse.json({ error: { code: "invalid_channel", message: "Direct and group conversations cannot be deleted from channel management" } }, { status: 400 });
  const [archived] = await db.update(employeeChatChannels).set({ isArchived: true, updatedAt: new Date() }).where(eq(employeeChatChannels.id, id)).returning();
  await writeEmployeeAudit(request, viewer, "chat.channel.archived", { type: "channel", id }, { kind: channel.kind, name: channel.name });
  return NextResponse.json({ data: archived, meta: { apiVersion: "1" } });
}
