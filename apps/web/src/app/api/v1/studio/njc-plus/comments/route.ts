import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  premiumCommentReports,
  premiumComments,
  premiumContent,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writePremiumAudit } from "@/lib/njc-plus";

const updateInput = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("comment"),
    id: z.uuid(),
    status: z.enum(["pending", "approved", "rejected", "deleted"]),
    reason: z.string().trim().min(4).max(500),
  }),
  z.object({
    target: z.literal("report"),
    id: z.uuid(),
    status: z.enum(["resolved", "dismissed"]),
    reason: z.string().trim().min(4).max(500),
  }),
]);

function canModerate(role: string) {
  return ["admin", "editor", "producer"].includes(role);
}

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer || !canModerate(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Moderation access is required" } }, { status: 403 });
  }
  if (!hasDatabase()) return NextResponse.json({ data: { comments: [], reports: [] }, meta: { apiVersion: "1" } });
  const [comments, reports] = await Promise.all([
    getDb().select({
      id: premiumComments.id,
      contentId: premiumComments.contentId,
      contentTitle: premiumContent.title,
      authorClerkId: premiumComments.authorClerkId,
      body: premiumComments.body,
      status: premiumComments.status,
      createdAt: premiumComments.createdAt,
    }).from(premiumComments)
      .leftJoin(premiumContent, eq(premiumComments.contentId, premiumContent.id))
      .orderBy(desc(premiumComments.createdAt)).limit(300),
    getDb().select().from(premiumCommentReports).orderBy(desc(premiumCommentReports.createdAt)).limit(300),
  ]);
  return NextResponse.json({ data: { comments, reports }, meta: { apiVersion: "1" } });
}

export async function PATCH(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || !canModerate(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Moderation access is required" } }, { status: 403 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  }
  const parsed = updateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_request", message: "A moderation reason is required" } }, { status: 400 });
  }
  const now = new Date();
  if (parsed.data.target === "comment") {
    const [record] = await getDb().transaction(async (tx) => {
      const [comment] = await tx.update(premiumComments).set({
        status: parsed.data.status,
        deletedAt: parsed.data.status === "deleted" ? now : null,
      }).where(eq(premiumComments.id, parsed.data.id)).returning();
      if (comment && ["rejected", "deleted"].includes(parsed.data.status)) {
        await tx.update(premiumCommentReports).set({
          status: "resolved",
          reviewedByClerkId: viewer.id,
          reviewedAt: now,
        }).where(and(
          eq(premiumCommentReports.commentId, comment.id),
          eq(premiumCommentReports.status, "open"),
        ));
      }
      return [comment];
    });
    if (!record) return NextResponse.json({ error: { code: "not_found", message: "Comment not found" } }, { status: 404 });
  } else {
    const [record] = await getDb().update(premiumCommentReports).set({
      status: parsed.data.status,
      reviewedByClerkId: viewer.id,
      reviewedAt: now,
    }).where(eq(premiumCommentReports.id, parsed.data.id)).returning();
    if (!record) return NextResponse.json({ error: { code: "not_found", message: "Report not found" } }, { status: 404 });
  }
  await writePremiumAudit({
    request,
    actorClerkId: viewer.id,
    action: `${parsed.data.target}.${parsed.data.status}`,
    targetType: parsed.data.target,
    targetId: parsed.data.id,
    reason: parsed.data.reason,
  });
  return NextResponse.json({ data: { updated: true }, meta: { apiVersion: "1" } });
}
