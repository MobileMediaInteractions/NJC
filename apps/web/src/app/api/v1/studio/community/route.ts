import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityBulletins, communityEventSubmissions } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canManageCommunity, canPublishCommunity, communityBulletinInput, communitySlug } from "@/lib/community";
import { getSiteConfiguration } from "@/lib/site-settings";
import { writeApiAudit } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

async function authorized(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return { response: NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 }) };
  if (!canManageCommunity(viewer.role)) return { response: NextResponse.json({ error: { code: "forbidden", message: "Community desk access is restricted" } }, { status: 403 }) };
  if (!(await getSiteConfiguration()).studio.modules.community) return { response: NextResponse.json({ error: { code: "module_disabled", message: "The Community desk is currently disabled in Studio configuration" } }, { status: 404 }) };
  if (!hasDatabase()) return { response: NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 }) };
  return { viewer, request };
}

export async function GET(request: Request) {
  const access = await authorized(request);
  if ("response" in access) return access.response;
  try {
    const [bulletins, submissions] = await Promise.all([
      getDb().select().from(communityBulletins).orderBy(desc(communityBulletins.updatedAt)).limit(200),
      getDb().select().from(communityEventSubmissions).orderBy(asc(communityEventSubmissions.status), desc(communityEventSubmissions.createdAt)).limit(200),
    ]);
    return NextResponse.json({ data: { bulletins, submissions }, meta: { apiVersion: "1" } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Studio community desk lookup failed", error);
    return NextResponse.json({ error: { code: "lookup_failed", message: "Community listings could not be loaded" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await authorized(request);
  if ("response" in access) return access.response;
  const parsed = communityBulletinInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Review the bulletin details", details: parsed.error.flatten() } }, { status: 400 });
  if (parsed.data.status === "published" && !canPublishCommunity(access.viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "An editor, producer or administrator must publish community listings" } }, { status: 403 });
  try {
    const value = parsed.data;
    const id = crypto.randomUUID();
    const [bulletin] = await getDb().transaction(async (tx) => {
      if (value.submissionId) {
        const [source] = await tx.select({ id: communityEventSubmissions.id, status: communityEventSubmissions.status }).from(communityEventSubmissions).where(eq(communityEventSubmissions.id, value.submissionId)).limit(1);
        if (!source || (source.status !== "pending" && source.status !== "reviewing")) throw new Error("SUBMISSION_NOT_APPROVABLE");
      }
      const created = await tx.insert(communityBulletins).values({
        id,
        title: value.title,
        slug: `${communitySlug(value.title)}-${id.slice(0, 8)}`,
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
        createdByClerkId: access.viewer.id,
        updatedByClerkId: access.viewer.id,
        publishedAt: value.status === "published" ? new Date() : null,
      }).returning();
      if (value.submissionId) {
        const [approved] = await tx.update(communityEventSubmissions).set({ status: "approved", reviewedByClerkId: access.viewer.id, reviewedAt: new Date() }).where(and(
          eq(communityEventSubmissions.id, value.submissionId),
          inArray(communityEventSubmissions.status, ["pending", "reviewing"]),
        )).returning({ id: communityEventSubmissions.id });
        if (!approved) throw new Error("SUBMISSION_NOT_APPROVABLE");
      }
      return created;
    });
    await writeApiAudit({ actorClerkId: access.viewer.id, event: "community.bulletin.created", request, metadata: { bulletinId: id, status: value.status, sourceSubmissionId: value.submissionId } });
    return NextResponse.json({ data: bulletin, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SUBMISSION_NOT_APPROVABLE") return NextResponse.json({ error: { code: "submission_unavailable", message: "That reader submission is no longer available to publish" } }, { status: 409 });
    console.error("Community bulletin creation failed", { actorId: access.viewer.id, error });
    return NextResponse.json({ error: { code: "save_failed", message: "The bulletin could not be saved" } }, { status: 500 });
  }
}
