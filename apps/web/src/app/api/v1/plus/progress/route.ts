import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent, premiumPlaybackProgress, premiumPreviewInvitations } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import { resolveNjcPlusSurface, resolvePremiumAccess } from "@/lib/njc-plus";
import { getActivePreviewInvitation } from "@/lib/njc-plus-preview";
import { nextPreviewViewingStatus } from "@/lib/njc-plus-preview-policy";

const input = z.object({
  contentId: z.uuid(),
  positionMs: z.number().int().min(0).max(604_800_000),
  durationMs: z.number().int().min(0).max(604_800_000).nullable().optional(),
  completed: z.boolean().default(false),
  devicePlatform: z.enum(["web", "ios", "android", "tvos", "roku", "other"]).default("web"),
});

export async function GET() {
  const surface = await resolveNjcPlusSurface();
  if (!surface.available) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const user = await getAccountIdentity();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in to sync playback progress" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1" } });
  const data = await getDb().select().from(premiumPlaybackProgress).where(eq(premiumPlaybackProgress.userClerkId, user.clerkId)).orderBy(desc(premiumPlaybackProgress.updatedAt)).limit(100);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function PUT(request: Request) {
  const user = await getAccountIdentity();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in to sync playback progress" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Playback sync is unavailable" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Invalid playback progress" } }, { status: 400 });
  const [surface, previewAccess, contentRows] = await Promise.all([
    resolveNjcPlusSurface(),
    getActivePreviewInvitation(parsed.data.contentId, user.clerkId),
    getDb().select().from(premiumContent).where(eq(premiumContent.id, parsed.data.contentId)).limit(1),
  ]);
  const content = contentRows[0];
  if (!content) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  if (!previewAccess) {
    if (!surface.available || content.status !== "published" || content.archivedAt) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
    if (!(await resolvePremiumAccess(content)).allowed) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }
  const [record] = await getDb().insert(premiumPlaybackProgress).values({ ...parsed.data, durationMs: parsed.data.durationMs ?? null, userClerkId: user.clerkId }).onConflictDoUpdate({
    target: [premiumPlaybackProgress.userClerkId, premiumPlaybackProgress.contentId],
    set: { positionMs: parsed.data.positionMs, durationMs: parsed.data.durationMs ?? null, completed: parsed.data.completed, devicePlatform: parsed.data.devicePlatform, updatedAt: new Date() },
  }).returning();
  if (previewAccess) {
    const now = new Date();
    await getDb().update(premiumPreviewInvitations).set({
      status: nextPreviewViewingStatus({ currentStatus: previewAccess.invitation.status, completedAt: previewAccess.invitation.completedAt, completedNow: parsed.data.completed }),
      firstViewedAt: previewAccess.invitation.firstViewedAt ?? now,
      lastViewedAt: now,
      completedAt: parsed.data.completed ? now : previewAccess.invitation.completedAt,
      updatedAt: now,
    }).where(eq(premiumPreviewInvitations.id, previewAccess.invitation.id));
  }
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
