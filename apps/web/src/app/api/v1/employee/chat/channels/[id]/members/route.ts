import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeChatMembers, users } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel, isValidEmployeeUuid } from "@/lib/employee-chat";
import { roleCapabilities } from "@/lib/employee-permissions";

const input = z.object({ userClerkId: z.string().trim().min(1).max(200) });
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("chat:read"); const { id } = await context.params;
  if (!viewer || !hasDatabase() || !isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const data = await getDb().select({ userClerkId: employeeChatMembers.userClerkId, membershipRole: employeeChatMembers.membershipRole, joinedAt: employeeChatMembers.joinedAt, displayName: users.displayName, title: users.title }).from(employeeChatMembers).leftJoin(users, eq(users.clerkId, employeeChatMembers.userClerkId)).where(and(eq(employeeChatMembers.channelId, id), isNull(employeeChatMembers.leftAt)));
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("chat:manage"); const { id } = await context.params;
  if (!viewer || !hasDatabase() || !isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "A valid directory member is required" } }, { status: 400 });
  const [account] = await getDb().select({ clerkId: users.clerkId, active: users.isActive, role: users.role }).from(users).where(eq(users.clerkId, parsed.data.userClerkId)).limit(1);
  if (!account?.active || !roleCapabilities[account.role].includes("employee:access")) return NextResponse.json({ error: { code: "invalid_member", message: "That directory member is unavailable" } }, { status: 400 });
  const [member] = await getDb().insert(employeeChatMembers).values({ channelId: id, userClerkId: account.clerkId }).onConflictDoUpdate({ target: [employeeChatMembers.channelId, employeeChatMembers.userClerkId], set: { leftAt: null, joinedAt: new Date() } }).returning();
  await writeEmployeeAudit(request, viewer, "chat.member.added", { type: "channel", id }, { userClerkId: account.clerkId });
  return NextResponse.json({ data: member, meta: { apiVersion: "1" } }, { status: 201 });
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("chat:manage"); const { id } = await context.params;
  if (!viewer || !hasDatabase() || !isValidEmployeeUuid(id) || !(await getAuthorizedEmployeeChannel(viewer, id))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.userClerkId === viewer.id) return NextResponse.json({ error: { code: "invalid_request", message: "Choose another active member" } }, { status: 400 });
  await getDb().update(employeeChatMembers).set({ leftAt: new Date() }).where(and(eq(employeeChatMembers.channelId, id), eq(employeeChatMembers.userClerkId, parsed.data.userClerkId)));
  await writeEmployeeAudit(request, viewer, "chat.member.removed", { type: "channel", id }, { userClerkId: parsed.data.userClerkId });
  return NextResponse.json({ data: { removed: true }, meta: { apiVersion: "1" } });
}
