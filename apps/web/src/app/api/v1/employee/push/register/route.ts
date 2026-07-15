import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeePushDevices } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";

const input = z.object({ token: z.string().trim().regex(/^ExponentPushToken\[[^\]]+\]$/).max(300), platform: z.enum(["ios", "android"]), appVersion: z.string().trim().max(50).optional() });

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("employee:access");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Employee-app access is required" } }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "A valid employee-app push token is required" } }, { status: 400 });
  const [device] = await getDb().insert(employeePushDevices).values({ ...parsed.data, userClerkId: viewer.id }).onConflictDoUpdate({ target: employeePushDevices.token, set: { userClerkId: viewer.id, platform: parsed.data.platform, appVersion: parsed.data.appVersion, isActive: true, lastSeenAt: new Date() } }).returning();
  return NextResponse.json({ data: device, meta: { apiVersion: "1" } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const viewer = await requireEmployeeCapability("employee:access");
  if (!viewer || !hasDatabase()) return NextResponse.json({ error: { code: "forbidden", message: "Employee-app access is required" } }, { status: 403 });
  const parsed = z.object({ token: z.string().trim().max(300) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "A device token is required" } }, { status: 400 });
  await getDb().update(employeePushDevices).set({ isActive: false, lastSeenAt: new Date() }).where(eq(employeePushDevices.token, parsed.data.token));
  return NextResponse.json({ data: { disabled: true }, meta: { apiVersion: "1" } });
}
