import type { EmployeeCapability, StaffRole } from "@harborline/contracts";
import { employeeCapabilities } from "@harborline/contracts";

export type CapabilityGrant = {
  capability: string;
  effect: string;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
};

export const roleCapabilities: Record<StaffRole, readonly EmployeeCapability[]> = {
  admin: employeeCapabilities,
  editor: [
    "employee:access",
    "chat:read",
    "chat:write",
    "chat:manage",
    "chat:moderate",
    "tools:metrics",
    "tools:editorial",
    "tools:press",
    "tools:alerts",
    "tools:live",
    "access:review",
  ],
  producer: [
    "employee:access",
    "chat:read",
    "chat:write",
    "tools:metrics",
    "tools:editorial",
    "tools:press",
    "tools:alerts",
    "tools:live",
  ],
  reporter: ["employee:access", "chat:read", "chat:write", "tools:metrics"],
  contributor: [],
};

export function isEmployeeCapability(value: string): value is EmployeeCapability {
  return employeeCapabilities.includes(value as EmployeeCapability);
}

export function resolveEmployeeCapabilities(
  role: StaffRole,
  grants: readonly CapabilityGrant[],
  now = new Date(),
) {
  const capabilities = new Set<EmployeeCapability>(roleCapabilities[role]);
  for (const grant of grants) {
    if (
      !isEmployeeCapability(grant.capability) ||
      grant.revokedAt ||
      (grant.expiresAt && grant.expiresAt <= now)
    )
      continue;
    if (grant.effect === "deny") capabilities.delete(grant.capability);
    else if (grant.effect === "allow") capabilities.add(grant.capability);
  }
  if (!capabilities.has("employee:access")) {
    return [];
  }
  return employeeCapabilities.filter((capability) => capabilities.has(capability));
}

export function canTransitionAccessRequest(
  current: string,
  next: string,
  reviewerIsRequester: boolean,
) {
  if (reviewerIsRequester) return false;
  if (current !== "pending") return false;
  return next === "approved" || next === "denied";
}
