import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import {
  employeeChatChannels,
  employeeChatMembers,
} from "@harborline/backend/schema";
import type { EmployeeViewer } from "@/lib/employee-auth";

export function sanitizeEmployeeMessage(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export async function getAuthorizedEmployeeChannel(
  viewer: EmployeeViewer,
  channelId: string,
  action: "read" | "write" = "read",
) {
  if (!viewer.capabilities.includes(action === "write" ? "chat:write" : "chat:read"))
    return null;
  const db = getDb();
  const [channel] = await db
    .select()
    .from(employeeChatChannels)
    .where(and(eq(employeeChatChannels.id, channelId), eq(employeeChatChannels.isArchived, false)))
    .limit(1);
  if (!channel) return null;
  if (channel.kind === "public") return channel;
  const [membership] = await db
    .select({ id: employeeChatMembers.id })
    .from(employeeChatMembers)
    .where(
      and(
        eq(employeeChatMembers.channelId, channelId),
        eq(employeeChatMembers.userClerkId, viewer.id),
        isNull(employeeChatMembers.leftAt),
      ),
    )
    .limit(1);
  return membership ? channel : null;
}

export function isValidEmployeeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
