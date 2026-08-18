import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  premiumContent,
  mediaAssets,
  premiumPreviewConfigurations,
  premiumPreviewInvitations,
  premiumPreviewQuestions,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writePremiumAudit } from "@/lib/njc-plus";
import { premiumPreviewConfigurationInput } from "@/lib/njc-plus-contract";
import { getPreviewConfiguration } from "@/lib/njc-plus-preview";
import { getStudioAccount, getStudioAccountSummaries } from "@/lib/studio-accounts";

const idSchema = z.uuid();
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("configure"), configuration: premiumPreviewConfigurationInput }),
  z.object({ action: z.literal("invite"), userClerkId: z.string().trim().min(5).max(200), startsAt: z.iso.datetime().nullable().optional(), expiresAt: z.iso.datetime().nullable().optional() }),
  z.object({ action: z.literal("revoke"), invitationId: z.uuid() }),
]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  const id = idSchema.safeParse((await context.params).id);
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Producer, editor or administrator access is required" } }, { status: 403 });
  if (!id.success || !hasDatabase()) return NextResponse.json({ data: null, meta: { apiVersion: "1" } });
  const data = await getPreviewConfiguration(id.data);
  const accounts = data ? await getStudioAccountSummaries(data.invitations.map((invitation) => invitation.userClerkId)) : [];
  return NextResponse.json({ data: data ? { ...data, accounts } : null, meta: { apiVersion: "1" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  const contentId = idSchema.safeParse((await context.params).id);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Producer, editor or administrator access is required" } }, { status: 403 });
  if (!contentId.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the Courier Cut settings", details: parsed.success ? undefined : parsed.error.flatten() } }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const [content] = await getDb().select({ id: premiumContent.id }).from(premiumContent).where(eq(premiumContent.id, contentId.data)).limit(1);
  if (!content) return NextResponse.json({ error: { code: "not_found", message: "Production not found" } }, { status: 404 });
  const value = parsed.data;
  if (value.action === "configure") {
    if (value.configuration.enabled) {
      const [media] = await getDb().select({ visibility: mediaAssets.visibility }).from(premiumContent).leftJoin(mediaAssets, eq(mediaAssets.id, premiumContent.mediaAssetId)).where(eq(premiumContent.id, content.id)).limit(1);
      if (!media || !media.visibility || !["private", "internal"].includes(media.visibility)) return NextResponse.json({ error: { code: "private_media_required", message: "Enable The Courier Cut only after attaching media uploaded through Upload private preview" } }, { status: 409 });
    }
    const now = new Date();
    await getDb().transaction(async (tx) => {
      const [configuration] = await tx.insert(premiumPreviewConfigurations).values({
        contentId: content.id,
        enabled: value.configuration.enabled,
        disclaimer: value.configuration.disclaimer,
        opensAt: value.configuration.opensAt ? new Date(value.configuration.opensAt) : null,
        expiresAt: value.configuration.expiresAt ? new Date(value.configuration.expiresAt) : null,
        createdByClerkId: viewer.id,
        updatedByClerkId: viewer.id,
      }).onConflictDoUpdate({
        target: premiumPreviewConfigurations.contentId,
        set: {
          enabled: value.configuration.enabled,
          disclaimer: value.configuration.disclaimer,
          opensAt: value.configuration.opensAt ? new Date(value.configuration.opensAt) : null,
          expiresAt: value.configuration.expiresAt ? new Date(value.configuration.expiresAt) : null,
          updatedByClerkId: viewer.id,
          updatedAt: now,
        },
      }).returning();
      if (!configuration) throw new Error("Preview configuration was not returned");
      await tx.delete(premiumPreviewQuestions).where(eq(premiumPreviewQuestions.previewId, configuration.id));
      if (value.configuration.questions.length) {
        await tx.insert(premiumPreviewQuestions).values(value.configuration.questions.map((question, index) => ({
          previewId: configuration.id,
          prompt: question.prompt,
          questionType: question.questionType,
          required: question.required,
          options: question.options,
          sortOrder: question.sortOrder ?? index,
        })));
      }
    });
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: "preview.configured", targetType: "premium_content", targetId: content.id, metadata: { enabled: value.configuration.enabled, questionCount: value.configuration.questions.length } });
  } else {
    const [configuration] = await getDb().select().from(premiumPreviewConfigurations).where(eq(premiumPreviewConfigurations.contentId, content.id)).limit(1);
    if (!configuration) return NextResponse.json({ error: { code: "preview_not_configured", message: "Save Courier Cut settings before managing invitations" } }, { status: 409 });
    if (value.action === "invite") {
      const account = await getStudioAccount(value.userClerkId).catch(() => null);
      if (!account) return NextResponse.json({ error: { code: "account_not_found", message: "Choose an existing Courier account" } }, { status: 404 });
      const startsAt = value.startsAt ? new Date(value.startsAt) : new Date();
      const expiresAt = value.expiresAt ? new Date(value.expiresAt) : configuration.expiresAt;
      if (expiresAt && expiresAt <= startsAt) return NextResponse.json({ error: { code: "invalid_window", message: "Invitation expiration must be after access begins" } }, { status: 400 });
      await getDb().insert(premiumPreviewInvitations).values({
        previewId: configuration.id,
        userClerkId: value.userClerkId,
        startsAt,
        expiresAt,
        invitedByClerkId: viewer.id,
      }).onConflictDoUpdate({
        target: [premiumPreviewInvitations.previewId, premiumPreviewInvitations.userClerkId],
        set: { status: "invited", startsAt, expiresAt, firstViewedAt: null, lastViewedAt: null, completedAt: null, revokedAt: null, revokedByClerkId: null, invitedByClerkId: viewer.id, updatedAt: new Date() },
      });
      await writePremiumAudit({ request, actorClerkId: viewer.id, action: "preview.invited", targetType: "premium_content", targetId: content.id, metadata: { userClerkId: value.userClerkId, expiresAt } });
    } else {
      const [record] = await getDb().update(premiumPreviewInvitations).set({ status: "revoked", revokedAt: new Date(), revokedByClerkId: viewer.id, updatedAt: new Date() }).where(and(eq(premiumPreviewInvitations.id, value.invitationId), eq(premiumPreviewInvitations.previewId, configuration.id))).returning();
      if (!record) return NextResponse.json({ error: { code: "not_found", message: "Invitation not found" } }, { status: 404 });
      await writePremiumAudit({ request, actorClerkId: viewer.id, action: "preview.revoked", targetType: "preview_invitation", targetId: record.id, metadata: { userClerkId: record.userClerkId } });
    }
  }
  const data = await getPreviewConfiguration(content.id);
  const accounts = data ? await getStudioAccountSummaries(data.invitations.map((invitation) => invitation.userClerkId)) : [];
  return NextResponse.json({ data: data ? { ...data, accounts } : null, meta: { apiVersion: "1" } });
}
