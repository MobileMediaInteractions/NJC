import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumPreviewInvitations, premiumPreviewQuestions, premiumPreviewResponses } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import { getAccessiblePreviewContentBySlug } from "@/lib/njc-plus-preview";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { validatePreviewAnswers } from "@/lib/njc-plus-preview-policy";

const inputSchema = z.object({
  overallRating: z.number().int().min(1).max(5).nullable().optional(),
  writtenFeedback: z.string().trim().max(20_000).default(""),
  answers: z.array(z.object({ questionId: z.uuid(), value: z.union([z.string().max(10_000), z.number(), z.boolean()]) })).max(50),
});

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!(await isNjcPlusFeatureEnabled("njc_plus_preview_club"))) return NextResponse.json({ error: { code: "not_found", message: "Preview not found" } }, { status: 404 });
  const user = await getAccountIdentity();
  if (!user || !hasDatabase()) return NextResponse.json({ error: { code: "not_found", message: "Preview not found" } }, { status: 404 });
  const preview = await getAccessiblePreviewContentBySlug((await context.params).slug);
  if (!preview || preview.access.invitation.userClerkId !== user.clerkId) return NextResponse.json({ error: { code: "not_found", message: "Preview not found" } }, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check your preview feedback", details: parsed.error.flatten() } }, { status: 400 });
  const questions = await getDb().select().from(premiumPreviewQuestions).where(eq(premiumPreviewQuestions.previewId, preview.access.preview.id));
  const answerError = validatePreviewAnswers(questions, parsed.data.answers);
  if (answerError) return NextResponse.json({ error: { code: "invalid_answer", message: answerError } }, { status: 400 });
  const now = new Date();
  const [record] = await getDb().transaction(async (tx) => {
    const response = await tx.insert(premiumPreviewResponses).values({
      invitationId: preview.access.invitation.id,
      overallRating: parsed.data.overallRating ?? null,
      writtenFeedback: parsed.data.writtenFeedback,
      answers: parsed.data.answers,
    }).onConflictDoUpdate({
      target: premiumPreviewResponses.invitationId,
      set: { overallRating: parsed.data.overallRating ?? null, writtenFeedback: parsed.data.writtenFeedback, answers: parsed.data.answers, updatedAt: now },
    }).returning();
    await tx.update(premiumPreviewInvitations).set({ status: "feedback_submitted", updatedAt: now }).where(eq(premiumPreviewInvitations.id, preview.access.invitation.id));
    return response;
  });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
