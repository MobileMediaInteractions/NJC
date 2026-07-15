import { and, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeCapabilityGrants, users } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";
import { resolveEmployeeCapabilities } from "@/lib/employee-permissions";

export async function GET() {
  const viewer = await requireEmployeeCapability("chat:read");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Internal directory access is required" } }, { status: 403 });
  const db = getDb();
  const accounts = await db.select({ clerkId: users.clerkId, displayName: users.displayName, title: users.title, role: users.role, avatarUrl: users.avatarUrl }).from(users).where(eq(users.isActive, true)).limit(500);
  const grants = await db.select({ userClerkId: employeeCapabilityGrants.userClerkId, capability: employeeCapabilityGrants.capability, effect: employeeCapabilityGrants.effect, expiresAt: employeeCapabilityGrants.expiresAt, revokedAt: employeeCapabilityGrants.revokedAt }).from(employeeCapabilityGrants).where(and(isNull(employeeCapabilityGrants.revokedAt), or(isNull(employeeCapabilityGrants.expiresAt), gt(employeeCapabilityGrants.expiresAt, new Date()))));
  const data = accounts.filter((account) => resolveEmployeeCapabilities(account.role, grants.filter((grant) => grant.userClerkId === account.clerkId)).includes("employee:access")).map((account) => ({ clerkId: account.clerkId, displayName: account.displayName, title: account.title, avatarUrl: account.avatarUrl }));
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
