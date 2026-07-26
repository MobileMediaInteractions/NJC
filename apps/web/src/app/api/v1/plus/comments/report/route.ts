import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumCommentReports, premiumComments } from "@harborline/backend/schema";
import { eq } from "drizzle-orm";
import { getAccountIdentity } from "@/lib/auth";
import { resolveNjcPlusSurface, writePremiumAudit } from "@/lib/njc-plus";

const input = z.object({
  commentId: z.uuid(),
  reason: z.string().trim().min(4).max(500),
});

export async function POST(request: Request) {
  const surface = await resolveNjcPlusSurface({ feature: "njc_plus_comments" });
  if (!surface.available) {
    return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }
  const user = await getAccountIdentity();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in to report a comment" } }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: { code: "service_not_configured", message: "Reporting is unavailable" } }, { status: 503 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Choose a valid report reason" } }, { status: 400 });
  }
  const [comment] = await getDb().select({ id: premiumComments.id }).from(premiumComments)
    .where(eq(premiumComments.id, parsed.data.commentId)).limit(1);
  if (!comment) {
    return NextResponse.json({ error: { code: "not_found", message: "Comment not found" } }, { status: 404 });
  }
  try {
    const [report] = await getDb().insert(premiumCommentReports).values({
      commentId: parsed.data.commentId,
      reporterClerkId: user.clerkId,
      reason: parsed.data.reason,
    }).returning({ id: premiumCommentReports.id });
    await writePremiumAudit({
      request,
      actorClerkId: user.clerkId,
      action: "comment.reported",
      targetType: "comment",
      targetId: parsed.data.commentId,
      metadata: { reportId: report.id },
    });
    return NextResponse.json({ data: { accepted: true }, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return NextResponse.json({ error: { code: "already_reported", message: "You already reported this comment" } }, { status: 409 });
    }
    return NextResponse.json({ error: { code: "report_failed", message: "The report could not be submitted" } }, { status: 500 });
  }
}
