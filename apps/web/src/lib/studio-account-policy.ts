import { z } from "zod";
import type { StaffRole } from "@harborline/contracts";
import { managedStaffRoles } from "@/lib/studio-account-types";

export const managedStaffRoleSchema = z.enum(managedStaffRoles);

export const studioAccountUpdateSchema = z.object({
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  title: z.string().trim().max(120),
  role: managedStaffRoleSchema.nullable(),
});

export type StudioAccountUpdate = z.infer<typeof studioAccountUpdateSchema>;

export function canChangeManagedRole(input: {
  actorId: string;
  targetId: string;
  currentRole: StaffRole | null;
  nextRole: StaffRole | null;
}) {
  return input.actorId !== input.targetId || input.currentRole === input.nextRole;
}
