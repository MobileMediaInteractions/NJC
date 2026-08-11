import { asc, eq } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import {
  pressAssets,
  pressKitAuditLogs,
  pressKitMessages,
  pressKitPackages,
  pressKitRequestAssets,
  pressKitRequests,
} from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudioUser } from "@/lib/auth";
import { generateAuthorizedPressPackage } from "@/lib/press-kit-package";
import { sendPressKitEmail } from "@/lib/press-kit-email";
import { PRESS_LICENSE_VERSION, PRESS_POLICY_VERSION, type PressPolicyDecision } from "@/lib/press-kit-policy";
import { getPressAssetCatalog, replacePressRequestAssetDecisions, writePressAudit } from "@/lib/press-kit-server";
import { confirmedPressProfile, readPressRequest, serializePressRequest } from "@/lib/press-kit-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  action: z.enum(["approve", "partially_approve", "deny", "request_information", "revoke"]),
  approvedAssetIds: z.array(z.uuid()).max(50).default([]),
  reviewerNote: z.string().trim().min(5).max(2_000),
});

async function reviewer() {
  const viewer = await getStudioUser();
  return viewer && ["admin", "editor", "producer"].includes(viewer.role) ? viewer : null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await reviewer();
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press review access is required." } }, { status: 403 });
  const { id } = await context.params;
  const row = await readPressRequest(id);
  if (!row) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  const db = getDb();
  const [messages, requestAssets, packages, audit] = await Promise.all([
    db.select().from(pressKitMessages).where(eq(pressKitMessages.requestId, id)).orderBy(asc(pressKitMessages.createdAt)),
    db.select({ link: pressKitRequestAssets, asset: pressAssets }).from(pressKitRequestAssets)
      .innerJoin(pressAssets, eq(pressAssets.id, pressKitRequestAssets.assetId))
      .where(eq(pressKitRequestAssets.requestId, id)),
    db.select().from(pressKitPackages).where(eq(pressKitPackages.requestId, id)).limit(1),
    db.select().from(pressKitAuditLogs).where(eq(pressKitAuditLogs.requestId, id)).orderBy(asc(pressKitAuditLogs.createdAt)),
  ]);
  return NextResponse.json({ request: serializePressRequest(row), messages, requestAssets, package: packages[0] ?? null, audit }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await reviewer();
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press review access is required." } }, { status: 403 });
  const { id } = await context.params;
  const current = await readPressRequest(id);
  if (!current) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_review", message: "Choose an action and provide a review note.", details: parsed.error.flatten() } }, { status: 400 });
  if (current.ownerClerkId === viewer.id && ["approve", "partially_approve"].includes(parsed.data.action)) return NextResponse.json({ error: { code: "self_review_forbidden", message: "A different authorized reviewer must approve this request." } }, { status: 403 });
  const db = getDb();
  const now = new Date();

  if (parsed.data.action === "revoke") {
    await db.update(pressKitPackages).set({ status: "revoked", revokedAt: now, updatedAt: now }).where(eq(pressKitPackages.requestId, id));
    const [updated] = await db.update(pressKitRequests).set({ status: "revoked", reviewerNote: parsed.data.reviewerNote, reviewedByClerkId: viewer.id, reviewedAt: now, updatedAt: now })
      .where(eq(pressKitRequests.id, id)).returning();
    await writePressAudit({ request, requestId: id, actorType: "staff", actorId: viewer.id, action: "press_authorization_revoked", metadata: { note: parsed.data.reviewerNote } });
    if (current.email) await sendPressKitEmail({ to: current.email, subject: `Press authorization ${id.slice(0, 8)} was revoked`, text: parsed.data.reviewerNote, eventId: `${id}-revoked-${now.valueOf()}` });
    return NextResponse.json({ request: serializePressRequest(updated) });
  }
  if (parsed.data.action === "deny" || parsed.data.action === "request_information") {
    const status = parsed.data.action === "deny" ? "denied" : "needs_information";
    const [updated] = await db.update(pressKitRequests).set({
      status,
      reviewerNote: parsed.data.reviewerNote,
      decisionReasons: [parsed.data.reviewerNote],
      reviewedByClerkId: viewer.id,
      reviewedAt: now,
      updatedAt: now,
    }).where(eq(pressKitRequests.id, id)).returning();
    await writePressAudit({ request, requestId: id, actorType: "staff", actorId: viewer.id, action: `press_request_${status}`, metadata: { note: parsed.data.reviewerNote } });
    if (current.email) await sendPressKitEmail({ to: current.email, subject: parsed.data.action === "deny" ? `Press request ${id.slice(0, 8)} was not approved` : `Press request ${id.slice(0, 8)} needs more information`, text: parsed.data.reviewerNote, eventId: `${id}-${status}-${now.valueOf()}` });
    return NextResponse.json({ request: serializePressRequest(updated) });
  }

  const profileResult = confirmedPressProfile(current);
  if (!profileResult.success) return NextResponse.json({ error: { code: "incomplete_request", message: "The request is missing required information and cannot be approved." } }, { status: 422 });
  if (!parsed.data.approvedAssetIds.length) return NextResponse.json({ error: { code: "assets_required", message: "Select at least one approved asset." } }, { status: 400 });
  const catalog = await getPressAssetCatalog({ includeInactive: true });
  const selected = catalog.filter((asset) => parsed.data.approvedAssetIds.includes(asset.id));
  if (selected.length !== new Set(parsed.data.approvedAssetIds).size || selected.some((asset) => !asset.active)) {
    return NextResponse.json({ error: { code: "invalid_asset_set", message: "One or more selected assets are unavailable." } }, { status: 400 });
  }
  const requestedIds = [...new Set([...current.requestedAssetIds, ...parsed.data.approvedAssetIds])];
  const rejectedAssetIds = requestedIds.filter((assetId) => !parsed.data.approvedAssetIds.includes(assetId));
  const restrictions = [...new Set(selected.flatMap((asset) => asset.restrictions))];
  const decision: PressPolicyDecision = {
    state: parsed.data.action === "approve" ? "approved" : "partially_approved",
    approvedAssetIds: parsed.data.approvedAssetIds,
    rejectedAssetIds,
    reasons: [parsed.data.reviewerNote],
    restrictions,
    missingInformation: [],
    manualReviewRequired: false,
    licenseType: PRESS_LICENSE_VERSION,
  };
  await replacePressRequestAssetDecisions({
    requestId: id,
    requestedIds: requestedIds.filter((assetId) => catalog.some((asset) => asset.id === assetId)),
    approvedIds: decision.approvedAssetIds,
    rejectedIds: decision.rejectedAssetIds,
    actorId: viewer.id,
  });
  await db.update(pressKitRequests).set({
    status: decision.state,
    policyVersion: PRESS_POLICY_VERSION,
    decisionReasons: decision.reasons,
    restrictions,
    licenseType: PRESS_LICENSE_VERSION,
    reviewerNote: parsed.data.reviewerNote,
    reviewedByClerkId: viewer.id,
    reviewedAt: now,
    updatedAt: now,
  }).where(eq(pressKitRequests.id, id));
  await writePressAudit({ request, requestId: id, actorType: "staff", actorId: viewer.id, action: `press_request_${decision.state}`, metadata: { approvedAssetIds: decision.approvedAssetIds, rejectedAssetIds } });
  try {
    const generatedPackage = await generateAuthorizedPressPackage({ requestId: id, profile: profileResult.data, decision, createdByClerkId: viewer.id });
    await sendPressKitEmail({ to: profileResult.data.email, subject: `Press package ${id.slice(0, 8)} is ready`, text: `Your request was ${decision.state.replace("_", " ")}. Return to the Press & Media portal in the same browser to download the authorized package before ${generatedPackage.expiresAt}.\n\n${parsed.data.reviewerNote}`, eventId: `${id}-staff-ready-${now.valueOf()}` });
    const ready = await readPressRequest(id);
    return NextResponse.json({ request: ready ? serializePressRequest(ready) : null, package: { id: generatedPackage.packageId, filename: generatedPackage.filename, expiresAt: generatedPackage.expiresAt } });
  } catch (error) {
    console.error("Staff-approved Press Kit package generation failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: { code: "package_generation_failed", message: "The decision was saved, but package generation failed." } }, { status: 503 });
  }
}
