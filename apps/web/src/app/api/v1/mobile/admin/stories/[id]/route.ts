import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";

const input = z.object({ status: z.enum(["draft", "review", "scheduled", "published", "archived"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("tools:editorial");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Editor authorization required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a valid editorial status" } }, { status: 400 });
  const { id } = await context.params;
  const [story] = await getDb().update(stories).set({
    status: parsed.data.status,
    publishedAt: parsed.data.status === "published" ? new Date() : undefined,
    updatedAt: new Date(),
  }).where(eq(stories.id, id)).returning();
  if (!story) return NextResponse.json({ error: { code: "not_found", message: "Story not found" } }, { status: 404 });
  const [latest] = await getDb().select({ version: storyRevisions.version }).from(storyRevisions).where(eq(storyRevisions.storyId, story.id)).orderBy(desc(storyRevisions.version)).limit(1);
  await getDb().insert(storyRevisions).values({ storyId: story.id, version: (latest?.version ?? 0) + 1, snapshot: story, note: `Mobile ${parsed.data.status} by ${viewer.name}` });
  return NextResponse.json({ data: story, meta: { apiVersion: "1" } });
}
