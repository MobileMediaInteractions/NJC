import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { EmployeeCapability, StaffRole } from "@harborline/contracts";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  employeeAuditLogs,
  employeeCapabilityGrants,
  users,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { resolveEmployeeCapabilities } from "@/lib/employee-permissions";

export type EmployeeViewer = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  capabilities: EmployeeCapability[];
};

export async function getEmployeeViewer(): Promise<EmployeeViewer | null> {
  const identity = await getStudioUser();
  if (!identity) return null;

  let role = identity.role;
  let grants: Array<{
    capability: string;
    effect: string;
    expiresAt: Date | null;
    revokedAt: Date | null;
  }> = [];

  if (hasDatabase()) {
    const db = getDb();
    const [account] = await db
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.clerkId, identity.id))
      .limit(1);
    if (account && !account.isActive) return null;
    if (account) role = account.role;
    grants = await db
      .select({
        capability: employeeCapabilityGrants.capability,
        effect: employeeCapabilityGrants.effect,
        expiresAt: employeeCapabilityGrants.expiresAt,
        revokedAt: employeeCapabilityGrants.revokedAt,
      })
      .from(employeeCapabilityGrants)
      .where(
        and(
          eq(employeeCapabilityGrants.userClerkId, identity.id),
          isNull(employeeCapabilityGrants.revokedAt),
          or(
            isNull(employeeCapabilityGrants.expiresAt),
            gt(employeeCapabilityGrants.expiresAt, new Date()),
          ),
        ),
      );
  }

  return {
    ...identity,
    role,
    capabilities: resolveEmployeeCapabilities(role, grants),
  };
}

export async function requireEmployeeCapability(capability: EmployeeCapability) {
  const viewer = await getEmployeeViewer();
  return viewer?.capabilities.includes(capability) ? viewer : null;
}

export async function writeEmployeeAudit(
  request: Request,
  viewer: EmployeeViewer,
  action: string,
  target?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
) {
  if (!hasDatabase()) return;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await getDb().insert(employeeAuditLogs).values({
    actorClerkId: viewer.id,
    action,
    targetType: target?.type,
    targetId: target?.id,
    metadata,
    ipAddress: forwarded ?? null,
  });
}
