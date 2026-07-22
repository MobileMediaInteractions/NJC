import { inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeePresence } from "@harborline/backend/schema";
import { resolveEmployeePresence } from "@/lib/employee-presence";

export async function getEmployeePresenceMap(userIds: string[]) {
  if (!hasDatabase() || !userIds.length) return new Map<string, ReturnType<typeof resolveEmployeePresence>>();
  const rows = await getDb().select().from(employeePresence).where(inArray(employeePresence.userClerkId, userIds));
  return new Map(rows.map((row) => [row.userClerkId, resolveEmployeePresence(row)]));
}
