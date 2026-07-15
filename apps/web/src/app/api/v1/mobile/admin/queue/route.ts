import { desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";
import { normalizeStory } from "@/lib/content";

export async function GET() {
  const viewer = await requireEmployeeCapability("tools:editorial");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Editorial-tools permission required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1", configured: false } });
  const rows = await getDb().select().from(stories).where(inArray(stories.status, ["review", "scheduled", "published"])).orderBy(desc(stories.updatedAt)).limit(40);
  return NextResponse.json({ data: rows.map(normalizeStory), meta: { apiVersion: "1" } });
}
