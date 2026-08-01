import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { resolvePublicByline } from "@/lib/bylines";
import { getSiteConfiguration } from "@/lib/site-settings";

const schema = z.object({ mode: z.enum(["account", "pseudonym"]), reason: z.string().trim().min(20).max(500), confirmation: z.literal("CORRECT BYLINE") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Administrator or editor access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Confirm the correction and provide a detailed audit reason" } }, { status: 400 });
  const { id } = await context.params;
  const [current] = await getDb().select().from(stories).where(eq(stories.id, id)).limit(1);
  if (!current || current.status !== "published" || !current.authorId) return NextResponse.json({ error: { code: "not_found", message: "A published story with an assigned author is required" } }, { status: 404 });
  if (parsed.data.mode === "pseudonym" && current.authorId !== viewer.databaseId) return NextResponse.json({ error: { code: "pseudonym_consent_required", message: "Only the author may opt their own identity into a pseudonymous correction. An editor may safely restore the verified account byline." } }, { status: 403 });
  if (parsed.data.mode === "pseudonym") {
    const configuration = await getSiteConfiguration();
    if (
      !configuration.features.pseudonyms ||
      !configuration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(viewer.role)
    ) {
      return NextResponse.json({ error: { code: "feature_disabled", message: "Pseudonymous bylines are not available for this role." } }, { status: 409 });
    }
  }
  const corrected = await resolvePublicByline(current.authorId, parsed.data.mode);
  const now = new Date();
  const updated = await getDb().transaction(async (tx) => {
    const correctedAuthors = current.publicBylinesSnapshot.length
      ? current.publicBylinesSnapshot.map((byline, index) => index === 0 ? { userId: current.authorId!, ...corrected } : byline)
      : [{ userId: current.authorId!, ...corrected }];
    const [story] = await tx.update(stories).set({ publicBylineSnapshot: corrected, publicBylinesSnapshot: correctedAuthors, contentVersion: current.contentVersion + 1, updatedAt: now }).where(eq(stories.id, current.id)).returning();
    const [latest] = await tx.select({ version: storyRevisions.version }).from(storyRevisions).where(eq(storyRevisions.storyId, current.id)).orderBy(desc(storyRevisions.version)).limit(1);
    await tx.insert(storyRevisions).values({ storyId: current.id, editorId: viewer.databaseId ?? null, version: (latest?.version ?? 0) + 1, snapshot: story, note: `Historical byline correction: ${parsed.data.reason}`, reviewStatus: "applied" });
    return story;
  });
  await writeApiAudit({ actorClerkId: viewer.id, event: "story.byline_corrected", request, metadata: { storyId: current.id, previousByline: current.publicBylineSnapshot?.name, correctedByline: corrected.name, mode: corrected.mode, reason: parsed.data.reason } });
  revalidatePath(`/story/${current.slug}`); revalidatePath(`/studio/stories/${current.id}`); revalidatePath("/api/v1/stories");
  return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
}
