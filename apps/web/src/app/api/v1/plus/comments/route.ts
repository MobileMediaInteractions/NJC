import { and, desc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumComments, premiumContent } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { resolveNjcPlusSurface, writePremiumAudit } from "@/lib/njc-plus";

const input = z.object({ contentId: z.uuid(), parentId: z.uuid().nullable().optional(), body: z.string().trim().min(2).max(4_000) });

export async function GET(request: Request) {
  const surface = await resolveNjcPlusSurface({ feature: "njc_plus_comments" });
  if (!surface.available || !(await isNjcPlusFeatureEnabled("njc_plus_comments"))) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const contentId = z.uuid().safeParse(new URL(request.url).searchParams.get("contentId"));
  if (!contentId.success || !hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1" } });
  const data = await getDb().select({ id: premiumComments.id, parentId: premiumComments.parentId, body: premiumComments.body, createdAt: premiumComments.createdAt, editedAt: premiumComments.editedAt }).from(premiumComments).where(and(eq(premiumComments.contentId, contentId.data), eq(premiumComments.status, "approved"))).orderBy(desc(premiumComments.createdAt)).limit(200);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const surface = await resolveNjcPlusSurface({ feature: "njc_plus_comments" });
  if (!surface.available) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const user = await getAccountIdentity();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in to comment" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Comments are unavailable" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the comment" } }, { status: 400 });
  const [content] = await getDb().select({ enabled: premiumContent.commentsEnabled }).from(premiumContent).where(eq(premiumContent.id, parsed.data.contentId)).limit(1);
  if (!content?.enabled) return NextResponse.json({ error: { code: "comments_disabled", message: "Comments are not open for this content" } }, { status: 409 });
  const [recent] = await getDb().select({ id: premiumComments.id }).from(premiumComments).where(and(
    eq(premiumComments.authorClerkId, user.clerkId),
    gt(premiumComments.createdAt, new Date(Date.now() - 30_000)),
  )).limit(1);
  if (recent) return NextResponse.json({ error: { code: "rate_limited", message: "Please wait before posting another comment" } }, { status: 429 });
  const [record] = await getDb().insert(premiumComments).values({ ...parsed.data, parentId: parsed.data.parentId ?? null, authorClerkId: user.clerkId }).returning({ id: premiumComments.id, status: premiumComments.status, createdAt: premiumComments.createdAt });
  await writePremiumAudit({ request, actorClerkId: user.clerkId, action: "comment.submitted", targetType: "comment", targetId: record.id, metadata: { contentId: parsed.data.contentId } });
  return NextResponse.json({ data: record, meta: { apiVersion: "1", moderation: "pending" } }, { status: 201 });
}
