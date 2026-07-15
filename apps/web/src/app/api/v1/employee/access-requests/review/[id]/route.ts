import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  employeeAccessRequests,
  employeeCapabilityGrants,
  employeeNotifications,
} from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { canTransitionAccessRequest } from "@/lib/employee-permissions";
import { isValidEmployeeUuid } from "@/lib/employee-chat";
import { sendEmployeePush } from "@/lib/employee-push";

const input = z.object({
  status: z.enum(["approved", "denied"]),
  reviewerNote: z.string().trim().max(1000).optional(),
  expiresAt: z.coerce.date().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("access:review");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Access-review permission is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const { id } = await context.params;
  if (!isValidEmployeeUuid(id)) return NextResponse.json({ error: { code: "not_found", message: "Request not found" } }, { status: 404 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose approve or deny" } }, { status: 400 });
  const db = getDb();
  const [current] = await db.select().from(employeeAccessRequests).where(eq(employeeAccessRequests.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: { code: "not_found", message: "Request not found" } }, { status: 404 });
  if (!canTransitionAccessRequest(current.status, parsed.data.status, current.requesterClerkId === viewer.id))
    return NextResponse.json({ error: { code: "invalid_transition", message: "This request cannot be reviewed by this account" } }, { status: 409 });

  const [record] = await db.transaction(async (tx) => {
    const updated = await tx.update(employeeAccessRequests).set({ status: parsed.data.status, reviewerNote: parsed.data.reviewerNote, reviewedByClerkId: viewer.id, reviewedAt: new Date(), expiresAt: parsed.data.expiresAt, updatedAt: new Date() }).where(eq(employeeAccessRequests.id, id)).returning();
    if (parsed.data.status === "approved") {
      await tx.insert(employeeCapabilityGrants).values({ userClerkId: current.requesterClerkId, capability: current.capability, effect: "allow", grantedByClerkId: viewer.id, reason: `Approved access request ${current.id}`, expiresAt: parsed.data.expiresAt });
    }
    await tx.insert(employeeNotifications).values({ recipientClerkId: current.requesterClerkId, kind: "access_request", title: parsed.data.status === "approved" ? "Access approved" : "Access request denied", body: parsed.data.status === "approved" ? "Your requested employee capability is now available." : "Your access request was reviewed. Open the employee app for details.", destination: "njcourier-employee:///v1/access-request" });
    return updated;
  });
  await writeEmployeeAudit(request, viewer, `access_request.${parsed.data.status}`, { type: "access_request", id }, { capability: current.capability, requesterClerkId: current.requesterClerkId });
  await sendEmployeePush([current.requesterClerkId], "Access request updated", "njcourier-employee:///v1/access-request");
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
