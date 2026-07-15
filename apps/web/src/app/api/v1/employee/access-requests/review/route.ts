import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeeAccessRequests } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";

export async function GET() {
  const viewer = await requireEmployeeCapability("access:review");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Access-review permission is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const data = await getDb().select().from(employeeAccessRequests).where(eq(employeeAccessRequests.status, "pending")).orderBy(desc(employeeAccessRequests.createdAt)).limit(100);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
