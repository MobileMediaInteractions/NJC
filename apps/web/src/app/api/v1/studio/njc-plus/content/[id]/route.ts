import { and, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  mediaAssetUsages,
  premiumContent,
  premiumContentRevisions,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { premiumContentInput, writePremiumAudit } from "@/lib/njc-plus";
import { canPublishStory } from "@/lib/story-workflow";

const idSchema = z.uuid();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success || !hasDatabase()) return NextResponse.json({ error: { code: "not_found", message: "NJC+ content not found" } }, { status: 404 });
  const [record, revisions] = await Promise.all([
    getDb().select().from(premiumContent).where(eq(premiumContent.id, id.data)).limit(1),
    getDb().select().from(premiumContentRevisions).where(eq(premiumContentRevisions.contentId, id.data)).orderBy(desc(premiumContentRevisions.version)).limit(50),
  ]);
  if (!record[0]) return NextResponse.json({ error: { code: "not_found", message: "NJC+ content not found" } }, { status: 404 });
  return NextResponse.json({ data: { content: record[0], revisions }, meta: { apiVersion: "1" } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const id = idSchema.safeParse((await context.params).id);
  const parsed = premiumContentInput.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the NJC+ content fields", details: parsed.success ? undefined : parsed.error.flatten() } }, { status: 400 });
  if (["approved", "scheduled", "published"].includes(parsed.data.status) && !canPublishStory(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "A publishing role is required for that status" } }, { status: 403 });
  }
  const [current] = await getDb().select().from(premiumContent).where(eq(premiumContent.id, id.data)).limit(1);
  if (!current) return NextResponse.json({ error: { code: "not_found", message: "NJC+ content not found" } }, { status: 404 });
  const [slugConflict] = await getDb().select({ id: premiumContent.id }).from(premiumContent).where(and(eq(premiumContent.slug, parsed.data.slug), ne(premiumContent.id, current.id))).limit(1);
  if (slugConflict) return NextResponse.json({ error: { code: "slug_conflict", message: "That NJC+ URL slug is already in use" } }, { status: 409 });
  const now = new Date();
  const updated = await getDb().transaction(async (tx) => {
    const [record] = await tx.update(premiumContent).set({
      ...parsed.data,
      parentId: parsed.data.parentId || null,
      imageAssetId: parsed.data.imageAssetId || null,
      imageUrl: parsed.data.imageUrl || null,
      mediaAssetId: parsed.data.mediaAssetId || null,
      mediaUrl: parsed.data.mediaUrl || null,
      captionsUrl: parsed.data.captionsUrl || null,
      socialImageUrl: parsed.data.socialImageUrl || null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      publishedAt: parsed.data.status === "published" ? current.publishedAt ?? now : current.publishedAt,
      archivedAt: parsed.data.status === "archived" ? now : null,
      updatedByClerkId: viewer.id,
      updatedAt: now,
    }).where(and(eq(premiumContent.id, current.id), eq(premiumContent.updatedAt, current.updatedAt))).returning();
    if (!record) return null;
    const [latest] = await tx.select({ version: premiumContentRevisions.version }).from(premiumContentRevisions).where(eq(premiumContentRevisions.contentId, record.id)).orderBy(desc(premiumContentRevisions.version)).limit(1);
    await tx.insert(premiumContentRevisions).values({ contentId: record.id, version: (latest?.version ?? 0) + 1, snapshot: record, note: `${current.status} → ${record.status}`, editorClerkId: viewer.id });
    await tx.delete(mediaAssetUsages).where(and(
      eq(mediaAssetUsages.product, "njc_plus"),
      eq(mediaAssetUsages.ownerType, "premium_content"),
      eq(mediaAssetUsages.ownerId, record.id),
    ));
    const usages = [
      record.imageAssetId
        ? {
            assetId: record.imageAssetId,
            product: "njc_plus",
            ownerType: "premium_content",
            ownerId: record.id,
            field: "image",
          }
        : null,
      record.mediaAssetId
        ? {
            assetId: record.mediaAssetId,
            product: "njc_plus",
            ownerType: "premium_content",
            ownerId: record.id,
            field: "media",
          }
        : null,
    ].filter((usage): usage is NonNullable<typeof usage> => usage !== null);
    if (usages.length) await tx.insert(mediaAssetUsages).values(usages);
    return record;
  });
  if (!updated) return NextResponse.json({ error: { code: "conflict", message: "This content changed in another session. Reload before saving." } }, { status: 409 });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: "content.updated", targetType: "content", targetId: updated.id, metadata: { fromStatus: current.status, toStatus: updated.status, slug: updated.slug } });
  revalidatePath("/studio/njc-plus", "layout");
  revalidatePath("/plus", "layout");
  return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Administrator or editor access is required" } }, { status: 403 });
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success || !hasDatabase()) return NextResponse.json({ error: { code: "not_found", message: "NJC+ content not found" } }, { status: 404 });
  const now = new Date();
  const [record] = await getDb().update(premiumContent).set({ status: "archived", archivedAt: now, updatedAt: now, updatedByClerkId: viewer.id }).where(eq(premiumContent.id, id.data)).returning();
  if (!record) return NextResponse.json({ error: { code: "not_found", message: "NJC+ content not found" } }, { status: 404 });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: "content.archived", targetType: "content", targetId: record.id, reason: "Archived through Studio" });
  revalidatePath("/studio/njc-plus", "layout");
  revalidatePath("/plus", "layout");
  return NextResponse.json({ data: { id: record.id, archived: true }, meta: { apiVersion: "1" } });
}
