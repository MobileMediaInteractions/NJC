import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeNotifications } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";

export async function GET() {
  const viewer = await requireEmployeeCapability("employee:access");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Employee-app access is required" } }, { status: 403 });
  const data = await getDb().select().from(employeeNotifications).where(eq(employeeNotifications.recipientClerkId, viewer.id)).orderBy(desc(employeeNotifications.createdAt)).limit(100);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function PATCH(request: Request) {
  const viewer = await requireEmployeeCapability("employee:access");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Employee-app access is required" } }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).refine((value) => value.id || value.all).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a notification to mark read" } }, { status: 400 });
  const condition = parsed.data.id ? and(eq(employeeNotifications.id, parsed.data.id), eq(employeeNotifications.recipientClerkId, viewer.id)) : and(eq(employeeNotifications.recipientClerkId, viewer.id), isNull(employeeNotifications.readAt));
  await getDb().update(employeeNotifications).set({ readAt: new Date() }).where(condition);
  return NextResponse.json({ data: { updated: true }, meta: { apiVersion: "1" } });
}
