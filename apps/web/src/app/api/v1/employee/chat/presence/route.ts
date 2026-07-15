import { gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeePresence } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";
import { getAuthorizedEmployeeChannel } from "@/lib/employee-chat";

const input = z.object({ status: z.enum(["online", "away", "offline"]).default("online"), typingChannelId: z.string().uuid().nullable().optional() });

export async function GET() {
  const viewer = await requireEmployeeCapability("chat:read");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Chat access is required" } }, { status: 403 });
  const cutoff = new Date(Date.now() - 90_000);
  const data = await getDb().select().from(employeePresence).where(gt(employeePresence.lastSeenAt, cutoff));
  return NextResponse.json({ data: data.map((presence) => ({ ...presence, typingChannelId: presence.typingExpiresAt && presence.typingExpiresAt > new Date() ? presence.typingChannelId : null })), meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("chat:read");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Chat access is required" } }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Presence update was invalid" } }, { status: 400 });
  if (parsed.data.typingChannelId && !(await getAuthorizedEmployeeChannel(viewer, parsed.data.typingChannelId, "write"))) return NextResponse.json({ error: { code: "not_found", message: "Channel not found" } }, { status: 404 });
  const now = new Date();
  const [data] = await getDb().insert(employeePresence).values({ userClerkId: viewer.id, status: parsed.data.status, typingChannelId: parsed.data.typingChannelId, typingExpiresAt: parsed.data.typingChannelId ? new Date(now.getTime() + 8_000) : null, lastSeenAt: now }).onConflictDoUpdate({ target: employeePresence.userClerkId, set: { status: parsed.data.status, typingChannelId: parsed.data.typingChannelId, typingExpiresAt: parsed.data.typingChannelId ? new Date(now.getTime() + 8_000) : null, lastSeenAt: now } }).returning();
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
