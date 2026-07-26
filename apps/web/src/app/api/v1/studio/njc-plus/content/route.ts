import { and, desc, eq, ilike, or } from "drizzle-orm";
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

const querySchema = z.object({
  status: z.string().max(30).optional(),
  kind: z.string().max(40).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1", database: false } });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_query", message: "Check the content filters" } }, { status: 400 });
  const filters = [];
  if (parsed.data.status) filters.push(eq(premiumContent.status, parsed.data.status));
  if (parsed.data.kind) filters.push(eq(premiumContent.kind, parsed.data.kind));
  if (parsed.data.q) filters.push(or(ilike(premiumContent.title, `%${parsed.data.q}%`), ilike(premiumContent.slug, `%${parsed.data.q}%`))!);
  const data = await getDb().select().from(premiumContent)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(premiumContent.updatedAt))
    .limit(parsed.data.limit);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to create NJC+ content" } }, { status: 503 });
  const parsed = premiumContentInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the NJC+ content fields", details: parsed.error.flatten() } }, { status: 400 });
  if (["approved", "scheduled", "published"].includes(parsed.data.status) && !canPublishStory(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "A publishing role is required for that status" } }, { status: 403 });
  }
  try {
    const record = await getDb().transaction(async (tx) => {
      const [created] = await tx.insert(premiumContent).values({
        ...parsed.data,
        parentId: parsed.data.parentId || null,
        imageAssetId: parsed.data.imageAssetId || null,
        imageUrl: parsed.data.imageUrl || null,
        mediaAssetId: parsed.data.mediaAssetId || null,
        mediaUrl: parsed.data.mediaUrl || null,
        captionsUrl: parsed.data.captionsUrl || null,
        socialImageUrl: parsed.data.socialImageUrl || null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        publishedAt: parsed.data.status === "published" ? new Date() : null,
        createdByClerkId: viewer.id,
        updatedByClerkId: viewer.id,
      }).returning();
      if (!created) throw new Error("NJC+ content was not returned");
      await tx.insert(premiumContentRevisions).values({
        contentId: created.id,
        version: 1,
        snapshot: created,
        note: `Created as ${created.status}`,
        editorClerkId: viewer.id,
      });
      const usages = [
        created.imageAssetId
          ? {
              assetId: created.imageAssetId,
              product: "njc_plus",
              ownerType: "premium_content",
              ownerId: created.id,
              field: "image",
            }
          : null,
        created.mediaAssetId
          ? {
              assetId: created.mediaAssetId,
              product: "njc_plus",
              ownerType: "premium_content",
              ownerId: created.id,
              field: "media",
            }
          : null,
      ].filter((usage): usage is NonNullable<typeof usage> => usage !== null);
      if (usages.length) await tx.insert(mediaAssetUsages).values(usages);
      return created;
    });
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: "content.created", targetType: "content", targetId: record.id, metadata: { kind: record.kind, slug: record.slug, status: record.status } });
    revalidatePath("/studio/njc-plus");
    revalidatePath("/studio/njc-plus/content");
    revalidatePath("/plus");
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    const conflict = error instanceof Error && /unique|duplicate/i.test(error.message);
    return NextResponse.json({ error: { code: conflict ? "slug_conflict" : "create_failed", message: conflict ? "That NJC+ URL slug is already in use" : "NJC+ content could not be created" } }, { status: conflict ? 409 : 500 });
  }
}
