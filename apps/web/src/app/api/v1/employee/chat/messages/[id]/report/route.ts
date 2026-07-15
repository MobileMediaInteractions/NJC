import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatMessages, employeeChatReports } from "@harborline/backend/schema";
import { eq } from "drizzle-orm";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid } from "@/lib/employee-chat";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Chat access is required" } }, { status: 403 });
  const { id } = await context.params;
  const parsed = z.object({ reason: z.string().trim().min(3).max(1000) }).safeParse(await request.json().catch(() => null));
  if (!isValidEmployeeUuid(id) || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Provide a report reason" } }, { status: 400 });
  const [message] = await getDb().select().from(employeeChatMessages).where(eq(employeeChatMessages.id, id)).limit(1);
  if (!message || !(await getAuthorizedEmployeeChannel(viewer, message.channelId))) return NextResponse.json({ error: { code: "not_found", message: "Message not found" } }, { status: 404 });
  const [report] = await getDb().insert(employeeChatReports).values({ messageId: id, reporterClerkId: viewer.id, reason: parsed.data.reason }).onConflictDoNothing().returning();
  if (!report) return NextResponse.json({ error: { code: "duplicate_report", message: "You already reported this message" } }, { status: 409 });
  await writeEmployeeAudit(request, viewer, "chat.message.reported", { type: "message", id }, { channelId: message.channelId });
  return NextResponse.json({ data: report, meta: { apiVersion: "1" } }, { status: 201 });
}
