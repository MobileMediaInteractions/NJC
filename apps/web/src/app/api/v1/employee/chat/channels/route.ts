import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeCapabilityGrants, employeeChatChannels, employeeChatMembers, users } from "@harborline/backend/schema";
import { getEmployeeViewer, requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { resolveEmployeeCapabilities } from "@/lib/employee-permissions";

const input = z.object({
  kind: z.enum(["public", "private", "direct", "group"]),
  name: z.string().trim().min(1).max(80),
  topic: z.string().trim().max(300).optional(),
  memberClerkIds: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
});

export async function GET() {
  const viewer = await requireEmployeeCapability("chat:read");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Internal-chat access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Chat requires Postgres" } }, { status: 503 });
  const rows = await getDb().select({ channel: employeeChatChannels, membershipRole: employeeChatMembers.membershipRole, lastReadAt: employeeChatMembers.lastReadAt }).from(employeeChatChannels).leftJoin(employeeChatMembers, and(eq(employeeChatMembers.channelId, employeeChatChannels.id), eq(employeeChatMembers.userClerkId, viewer.id), isNull(employeeChatMembers.leftAt))).where(and(eq(employeeChatChannels.isArchived, false), or(eq(employeeChatChannels.kind, "public"), sql`${employeeChatMembers.id} is not null`))).orderBy(desc(employeeChatChannels.updatedAt));
  return NextResponse.json({ data: rows.map(({ channel, ...membership }) => ({ ...channel, ...membership })), meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getEmployeeViewer();
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Internal-chat access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Chat requires Postgres" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Provide a valid channel name and membership" } }, { status: 400 });
  const managesChannels = viewer.capabilities.includes("chat:manage");
  if ((parsed.data.kind === "public" || parsed.data.kind === "private") && !managesChannels) return NextResponse.json({ error: { code: "forbidden", message: "Channel-management permission is required" } }, { status: 403 });
  if ((parsed.data.kind === "direct" || parsed.data.kind === "group") && !viewer.capabilities.includes("chat:write")) return NextResponse.json({ error: { code: "forbidden", message: "Message permission is required" } }, { status: 403 });
  const members = [...new Set([viewer.id, ...parsed.data.memberClerkIds])].sort();
  if (parsed.data.kind === "direct" && members.length !== 2) return NextResponse.json({ error: { code: "invalid_request", message: "A direct conversation has exactly two members" } }, { status: 400 });
  const conversationKey = parsed.data.kind === "direct" || parsed.data.kind === "group" ? `${parsed.data.kind}:${members.join(":")}` : null;
  const db = getDb();
  const accounts = await db.select({ clerkId: users.clerkId, role: users.role }).from(users).where(and(inArray(users.clerkId, members), eq(users.isActive, true)));
  const grants = await db.select({ userClerkId: employeeCapabilityGrants.userClerkId, capability: employeeCapabilityGrants.capability, effect: employeeCapabilityGrants.effect, expiresAt: employeeCapabilityGrants.expiresAt, revokedAt: employeeCapabilityGrants.revokedAt }).from(employeeCapabilityGrants).where(and(inArray(employeeCapabilityGrants.userClerkId, members), isNull(employeeCapabilityGrants.revokedAt), or(isNull(employeeCapabilityGrants.expiresAt), gt(employeeCapabilityGrants.expiresAt, new Date()))));
  const eligible = accounts.filter((account) => resolveEmployeeCapabilities(account.role, grants.filter((grant) => grant.userClerkId === account.clerkId)).includes("employee:access")).map((account) => account.clerkId);
  if (members.some((member) => member !== viewer.id && !eligible.includes(member))) return NextResponse.json({ error: { code: "invalid_membership", message: "One or more requested members are unavailable" } }, { status: 400 });
  if (conversationKey) {
    const [existing] = await db.select().from(employeeChatChannels).where(eq(employeeChatChannels.conversationKey, conversationKey)).limit(1);
    if (existing) return NextResponse.json({ data: existing, meta: { apiVersion: "1", existing: true } });
  }
  const [channel] = await db.insert(employeeChatChannels).values({ kind: parsed.data.kind, name: parsed.data.name, topic: parsed.data.topic, conversationKey, createdByClerkId: viewer.id }).returning();
  await db.insert(employeeChatMembers).values(members.map((userClerkId) => ({ channelId: channel.id, userClerkId, membershipRole: userClerkId === viewer.id ? "owner" : "member" })));
  await writeEmployeeAudit(request, viewer, "chat.channel.created", { type: "channel", id: channel.id }, { kind: channel.kind, memberCount: members.length });
  return NextResponse.json({ data: channel, meta: { apiVersion: "1" } }, { status: 201 });
}
