import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeePresence } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel } from "@/lib/employee-chat";
import { employeePresencePlatforms, employeePresenceStatuses, resolveEmployeePresence } from "@/lib/employee-presence";

const input = z.object({ status: z.enum(employeePresenceStatuses).default("online"), platform: z.enum(employeePresencePlatforms).default("web"), typingChannelId: z.string().uuid().nullable().optional() });

export async function GET() {
  const viewer = await requireEmployeeCapability("chat:read");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Chat access is required" } }, { status: 403 });
  const now = new Date();
  const data = await getDb().select().from(employeePresence);
  return NextResponse.json({ data: data.map((presence) => ({ ...presence, ...resolveEmployeePresence(presence, now), typingChannelId: presence.typingExpiresAt && presence.typingExpiresAt > now ? presence.typingChannelId : null })), meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("chat:read");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Chat access is required" } }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Presence update was invalid" } }, { status: 400 });
  if (parsed.data.typingChannelId && !(await getAuthorizedEmployeeChannel(viewer, parsed.data.typingChannelId, "write"))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const now = new Date();
  const [data] = await getDb().insert(employeePresence).values({ userClerkId: viewer.id, status: parsed.data.status, platform: parsed.data.platform, typingChannelId: parsed.data.typingChannelId, typingExpiresAt: parsed.data.typingChannelId ? new Date(now.getTime() + 8_000) : null, lastSeenAt: now }).onConflictDoUpdate({ target: employeePresence.userClerkId, set: { status: parsed.data.status, platform: parsed.data.platform, typingChannelId: parsed.data.typingChannelId, typingExpiresAt: parsed.data.typingChannelId ? new Date(now.getTime() + 8_000) : null, lastSeenAt: now } }).returning();
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
