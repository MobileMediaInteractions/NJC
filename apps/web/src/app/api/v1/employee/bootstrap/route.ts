import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  employeeChatChannels,
  employeeChatMembers,
  employeeChatMessages,
  employeeNotifications,
} from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await requireEmployeeCapability("employee:access");
  if (!viewer)
    return NextResponse.json({ error: { code: "forbidden", message: "Employee-app access is required" } }, { status: 403 });
  if (!hasDatabase())
    return NextResponse.json({ error: { code: "service_not_configured", message: "Employee services require Postgres" } }, { status: 503 });

  const db = getDb();
  const channels = viewer.capabilities.includes("chat:read")
    ? await db
        .select({
          id: employeeChatChannels.id,
          kind: employeeChatChannels.kind,
          name: employeeChatChannels.name,
          topic: employeeChatChannels.topic,
          updatedAt: employeeChatChannels.updatedAt,
          lastReadAt: employeeChatMembers.lastReadAt,
          unread: sql<number>`count(${employeeChatMessages.id}) filter (where ${employeeChatMessages.createdAt} > coalesce(${employeeChatMembers.lastReadAt}, to_timestamp(0)) and ${employeeChatMessages.authorClerkId} <> ${viewer.id})::int`,
        })
        .from(employeeChatChannels)
        .leftJoin(
          employeeChatMembers,
          and(
            eq(employeeChatMembers.channelId, employeeChatChannels.id),
            eq(employeeChatMembers.userClerkId, viewer.id),
            isNull(employeeChatMembers.leftAt),
          ),
        )
        .leftJoin(employeeChatMessages, eq(employeeChatMessages.channelId, employeeChatChannels.id))
        .where(
          and(
            eq(employeeChatChannels.isArchived, false),
            or(eq(employeeChatChannels.kind, "public"), sql`${employeeChatMembers.id} is not null`),
          ),
        )
        .groupBy(employeeChatChannels.id, employeeChatMembers.lastReadAt)
        .orderBy(desc(employeeChatChannels.updatedAt))
    : [];
  const [notificationCount] = await db
    .select({ count: count() })
    .from(employeeNotifications)
    .where(and(eq(employeeNotifications.recipientClerkId, viewer.id), isNull(employeeNotifications.readAt)));

  return NextResponse.json({
    data: {
      viewer: { id: viewer.id, name: viewer.name, email: viewer.email, role: viewer.role, capabilities: viewer.capabilities },
      channels,
      unreadNotifications: notificationCount.count,
      transport: { kind: "cursor-polling", recommendedIntervalMs: 3000 },
      minimumVersion: process.env.EMPLOYEE_MIN_APP_VERSION ?? "1.0.0",
    },
    meta: { apiVersion: "1" },
  });
}
