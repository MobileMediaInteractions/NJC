import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityBulletins } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canManageCommunity, canPublishCommunity, communityBulletinInput } from "@/lib/community";
import { getSiteConfiguration } from "@/lib/site-settings";
import { writeApiAudit } from "@/lib/api-keys";

const idSchema = z.uuid();
const statusSchema = z.object({ status: z.enum(["draft", "published", "archived"]) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!canManageCommunity(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Community desk access is restricted" } }, { status: 403 });
  if (!(await getSiteConfiguration()).studio.modules.community) return NextResponse.json({ error: { code: "module_disabled", message: "The Community desk is currently disabled" } }, { status: 404 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const id = idSchema.safeParse((await context.params).id);
  const parsed = communityBulletinInput.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Review the bulletin details" } }, { status: 400 });
  try {
    const [current] = await getDb().select().from(communityBulletins).where(eq(communityBulletins.id, id.data)).limit(1);
    if (!current) return NextResponse.json({ error: { code: "not_found", message: "Bulletin listing not found" } }, { status: 404 });
    if ((current.status === "published" || parsed.data.status === "published") && !canPublishCommunity(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "An editor, producer or administrator must edit or publish public community listings" } }, { status: 403 });
    const value = parsed.data;
    const [updated] = await getDb().update(communityBulletins).set({
      title: value.title,
      category: value.category,
      description: value.description,
      startsAt: value.startsAt ? new Date(value.startsAt) : null,
      endsAt: value.endsAt ? new Date(value.endsAt) : null,
      venue: value.venue || null,
      city: value.city || null,
      organizer: value.organizer || null,
      externalUrl: value.externalUrl || null,
      status: value.status,
      isFeatured: value.isFeatured,
      publishedAt: value.status === "published" ? current.publishedAt ?? new Date() : null,
      updatedByClerkId: viewer.id,
      updatedAt: new Date(),
    }).where(eq(communityBulletins.id, current.id)).returning();
    await writeApiAudit({ actorClerkId: viewer.id, event: "community.bulletin.updated", request, metadata: { bulletinId: id.data, status: value.status } });
    revalidatePath("/community");
    revalidatePath("/studio/community");
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Community bulletin update failed", { actorId: viewer.id, bulletinId: id.data, error });
    return NextResponse.json({ error: { code: "update_failed", message: "The bulletin could not be updated" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!canManageCommunity(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Community desk access is restricted" } }, { status: 403 });
  if (!(await getSiteConfiguration()).studio.modules.community) return NextResponse.json({ error: { code: "module_disabled", message: "The Community desk is currently disabled" } }, { status: 404 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const id = idSchema.safeParse((await context.params).id);
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a valid bulletin status" } }, { status: 400 });
  try {
    const [current] = await getDb().select({ id: communityBulletins.id, status: communityBulletins.status, publishedAt: communityBulletins.publishedAt }).from(communityBulletins).where(eq(communityBulletins.id, id.data)).limit(1);
    if (!current) return NextResponse.json({ error: { code: "not_found", message: "Bulletin listing not found" } }, { status: 404 });
    if ((current.status === "published" || parsed.data.status !== "draft") && !canPublishCommunity(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "An editor, producer or administrator must publish, unpublish or archive community listings" } }, { status: 403 });
    const [updated] = await getDb().update(communityBulletins).set({ status: parsed.data.status, publishedAt: parsed.data.status === "published" ? current.publishedAt ?? new Date() : null, updatedAt: new Date(), updatedByClerkId: viewer.id }).where(eq(communityBulletins.id, current.id)).returning();
    await writeApiAudit({ actorClerkId: viewer.id, event: "community.bulletin.status_changed", request, metadata: { bulletinId: id.data, from: current.status, to: parsed.data.status } });
    revalidatePath("/community");
    revalidatePath("/studio/community");
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Community bulletin status change failed", { actorId: viewer.id, bulletinId: id.data, error });
    return NextResponse.json({ error: { code: "update_failed", message: "The bulletin could not be updated" } }, { status: 500 });
  }
}
