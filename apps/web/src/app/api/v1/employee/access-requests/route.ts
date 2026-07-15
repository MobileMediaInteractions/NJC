import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { employeeCapabilities } from "@harborline/contracts";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeAccessRequests } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writeEmployeeAudit } from "@/lib/employee-auth";
import { resolveEmployeeCapabilities } from "@/lib/employee-permissions";

const input = z.object({
  capability: z.enum(employeeCapabilities),
  sourceApp: z.enum(["reader", "employee", "web"]).default("reader"),
  intendedDestination: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const user = await getStudioUser();
  if (!user) return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in to view access requests" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Access requests require Postgres" } }, { status: 503 });
  const data = await getDb().select().from(employeeAccessRequests).where(eq(employeeAccessRequests.requesterClerkId, user.id)).orderBy(desc(employeeAccessRequests.createdAt)).limit(50);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const user = await getStudioUser();
  if (!user) return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in to request access" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Access requests require Postgres" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a supported capability" } }, { status: 400 });
  if (resolveEmployeeCapabilities(user.role, []).includes(parsed.data.capability))
    return NextResponse.json({ error: { code: "already_allowed", message: "Your account already has this capability" } }, { status: 409 });
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const existing = await getDb().select({ id: employeeAccessRequests.id }).from(employeeAccessRequests).where(and(eq(employeeAccessRequests.requesterClerkId, user.id), eq(employeeAccessRequests.capability, parsed.data.capability), eq(employeeAccessRequests.status, "pending"), gte(employeeAccessRequests.createdAt, since))).limit(1);
  if (existing.length) return NextResponse.json({ error: { code: "duplicate_request", message: "A request for this capability is already pending" } }, { status: 409 });
  const [record] = await getDb().insert(employeeAccessRequests).values({ requesterClerkId: user.id, requesterEmail: user.email, ...parsed.data }).returning();
  await writeEmployeeAudit(request, { ...user, capabilities: resolveEmployeeCapabilities(user.role, []) }, "access_request.created", { type: "access_request", id: record.id }, { capability: record.capability, sourceApp: record.sourceApp });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: 201 });
}
