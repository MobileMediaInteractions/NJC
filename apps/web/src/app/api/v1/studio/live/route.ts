import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { liveEvents } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writeApiAudit } from "@/lib/api-keys";
import {
  canWriteLiveCoverage,
  getStudioLiveEvents,
  liveEventCreateInput,
  liveSlug,
} from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  }
  if (!canWriteLiveCoverage(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Live desk access is restricted" } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is required for live desks" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ data: await getStudioLiveEvents(), meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || !canWriteLiveCoverage(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "A newsroom reporting role is required" } },
      { status: viewer ? 403 : 401 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is required for live desks" } },
      { status: 503 },
    );
  }
  const parsed = liveEventCreateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the live desk details", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const baseSlug = liveSlug(parsed.data.title);
  let slug = baseSlug;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const [existing] = await getDb()
      .select({ id: liveEvents.id })
      .from(liveEvents)
      .where(eq(liveEvents.slug, slug))
      .limit(1);
    if (!existing) break;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  try {
    const [event] = await getDb()
      .insert(liveEvents)
      .values({
        slug,
        title: parsed.data.title,
        description: parsed.data.description,
        location: parsed.data.location || null,
        relatedStoryId: parsed.data.relatedStoryId ?? null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        status: "draft",
        isLive: false,
        createdByClerkId: viewer.id,
        updatedByClerkId: viewer.id,
      })
      .returning();
    await writeApiAudit({
      request,
      actorClerkId: viewer.id,
      event: "live_desk.created",
      metadata: { eventId: event.id, slug: event.slug },
    });
    return NextResponse.json({ data: event, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    console.error("Live desk creation failed", error);
    return NextResponse.json(
      { error: { code: "save_failed", message: "The live desk could not be created" } },
      { status: 500 },
    );
  }
}
