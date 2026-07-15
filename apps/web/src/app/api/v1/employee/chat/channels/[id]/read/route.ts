import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatMembers } from "@harborline/backend/schema";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid } from "@/lib/employee-chat";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getEmployeeViewer();
  const { id } = await context.params;
  if (!viewer || !hasDatabase() || !isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const db = getDb();
  await db.insert(employeeChatMembers).values({ channelId: id, userClerkId: viewer.id, lastReadAt: new Date() }).onConflictDoUpdate({ target: [employeeChatMembers.channelId, employeeChatMembers.userClerkId], set: { lastReadAt: new Date(), leftAt: null } });
  return NextResponse.json({ data: { readAt: new Date().toISOString() }, meta: { apiVersion: "1" } });
}
