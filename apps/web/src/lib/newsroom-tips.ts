import { z } from "zod";
import type { StaffRole } from "@/lib/types";

export const tipInput = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  subject: z.string().trim().min(4).max(180),
  body: z.string().trim().min(10).max(10_000),
});

export const tipStatuses = ["new", "reviewing", "closed"] as const;
export type TipStatus = (typeof tipStatuses)[number];

export const tipStatusInput = z.object({
  status: z.enum(tipStatuses),
});

export function canViewNewsTips(role: StaffRole) {
  return role !== "contributor";
}

export function formatTipBadge(count: number) {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
