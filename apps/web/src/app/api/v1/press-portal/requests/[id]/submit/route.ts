import { and, eq, gt, ne } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { pressKitPackages, pressKitRequests } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { generateAuthorizedPressPackage } from "@/lib/press-kit-package";
import { sendPressKitEmail } from "@/lib/press-kit-email";
import { evaluatePressPolicy, PRESS_POLICY_VERSION, type PressPolicyDecision } from "@/lib/press-kit-policy";
import { limitPressPortalRequest } from "@/lib/press-kit-rate-limit";
import { getAuthorizedPressRequest, getPressAssetCatalog, isPressPortalEnabled, pressRequestIpHash, replacePressRequestAssetDecisions, writePressAudit } from "@/lib/press-kit-server";
import { confirmedPressProfile, notifyPressManualReview, pressDuplicateKey, serializePressRequest } from "@/lib/press-kit-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forcedManualReview(decision: PressPolicyDecision, concerns: string[]) {
  const sensitive = concerns.filter((item) => item !== "none");
  if (!sensitive.length) return decision;
  return {
    ...decision,
    state: "manual_review" as const,
    approvedAssetIds: [],
    licenseType: null,
    manualReviewRequired: true,
    reasons: ["The request contains input that requires staff verification before any materials can be authorized."],
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const { id } = await context.params;
  const row = await getAuthorizedPressRequest(request, id);
  if (!row) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  if (["evaluating", "package_generating"].includes(row.status)) {
    return NextResponse.json({ error: { code: "request_in_progress", message: "This request is already being processed." } }, { status: 409 });
  }
  if (["ready", "downloaded", "denied", "revoked", "expired", "manual_review"].includes(row.status)) {
    const [existingPackage] = await getDb().select({ id: pressKitPackages.id, status: pressKitPackages.status, expiresAt: pressKitPackages.expiresAt })
      .from(pressKitPackages).where(eq(pressKitPackages.requestId, id)).limit(1);
    return NextResponse.json({ request: serializePressRequest(row), package: existingPackage ?? null, idempotent: true }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const rate = await limitPressPortalRequest("submit", `${pressRequestIpHash(request)}:${id}`);
  if (!rate.success) return NextResponse.json({ error: { code: "rate_limit_exceeded", message: "This request was submitted too many times." } }, { status: 429 });

  const profileResult = confirmedPressProfile(row);
  if (!profileResult.success) {
    const [updated] = await getDb().update(pressKitRequests).set({
      status: "needs_information",
      decisionReasons: ["The structured request is incomplete."],
      updatedAt: new Date(),
    }).where(eq(pressKitRequests.id, id)).returning();
    return NextResponse.json({ request: serializePressRequest(updated), missingInformation: profileResult.error.flatten() }, { status: 422 });
  }
  const profile = profileResult.data;
  const duplicateKey = pressDuplicateKey(profile);
  const duplicateWindow = new Date(Date.now() - 10 * 60 * 1_000);
  const [duplicate] = await getDb().select({ id: pressKitRequests.id }).from(pressKitRequests).where(and(
    eq(pressKitRequests.duplicateKey, duplicateKey),
    ne(pressKitRequests.id, id),
    gt(pressKitRequests.createdAt, duplicateWindow),
  )).limit(1);
  if (duplicate) {
    return NextResponse.json({ error: { code: "duplicate_submission", message: "An identical request was submitted recently. Continue with the original request." } }, { status: 409 });
  }

  const catalog = await getPressAssetCatalog({ includeInactive: true });
  const baseDecision = evaluatePressPolicy(profile, catalog);
  const interpretation = row.aiInterpretation as { concerns?: unknown } | null;
  const concerns = Array.isArray(interpretation?.concerns)
    ? interpretation.concerns.filter((item): item is string => typeof item === "string")
    : [];
  const decision = forcedManualReview(baseDecision, concerns);
  const status = decision.state === "not_permitted" ? "denied" : decision.state;
  const [updated] = await getDb().update(pressKitRequests).set({
    status,
    duplicateKey,
    policyVersion: PRESS_POLICY_VERSION,
    decisionReasons: decision.reasons,
    restrictions: decision.restrictions,
    licenseType: decision.licenseType,
    updatedAt: new Date(),
  }).where(eq(pressKitRequests.id, id)).returning();
  const knownIds = new Set(catalog.map((asset) => asset.id));
  await replacePressRequestAssetDecisions({
    requestId: id,
    requestedIds: profile.requestedAssetIds.filter((assetId) => knownIds.has(assetId)),
    approvedIds: decision.manualReviewRequired ? [] : decision.approvedAssetIds,
    rejectedIds: decision.rejectedAssetIds.filter((assetId) => knownIds.has(assetId)),
  });
  await writePressAudit({ request, requestId: id, actorType: "system", action: "press_policy_evaluated", metadata: {
    policyVersion: PRESS_POLICY_VERSION,
    state: decision.state,
    approvedAssetIds: decision.approvedAssetIds,
    rejectedAssetIds: decision.rejectedAssetIds,
    manualReviewRequired: decision.manualReviewRequired,
  } });

  if (decision.manualReviewRequired) {
    await notifyPressManualReview(id, profile.organization);
    await sendPressKitEmail({ to: profile.email, subject: `Press request ${id.slice(0, 8)} needs staff review`, text: "Your request is complete and has been routed to an authorized Press & Media reviewer. No private or restricted materials have been released.", eventId: `${id}-manual-review` });
    return NextResponse.json({ request: serializePressRequest(updated), decision }, { status: 202, headers: { "Cache-Control": "private, no-store" } });
  }
  if (decision.state === "needs_information" || decision.state === "not_permitted") {
    await sendPressKitEmail({ to: profile.email, subject: decision.state === "not_permitted" ? `Press request ${id.slice(0, 8)} could not be authorized` : `Press request ${id.slice(0, 8)} needs more information`, text: decision.reasons.join("\n"), eventId: `${id}-${decision.state}` });
    return NextResponse.json({ request: serializePressRequest(updated), decision }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const generatedPackage = await generateAuthorizedPressPackage({ requestId: id, profile, decision });
    const [ready] = await getDb().select().from(pressKitRequests).where(eq(pressKitRequests.id, id)).limit(1);
    await sendPressKitEmail({ to: profile.email, subject: `Press package ${id.slice(0, 8)} is ready`, text: `Your request-specific package is ready. Return to the Press & Media portal in the same browser to download it before ${generatedPackage.expiresAt}.`, eventId: `${id}-ready` });
    return NextResponse.json({
      request: serializePressRequest(ready),
      decision,
      package: {
        id: generatedPackage.packageId,
        filename: generatedPackage.filename,
        expiresAt: generatedPackage.expiresAt,
        checksumSha256: generatedPackage.checksumSha256,
        downloadUrl: `/api/v1/press-portal/packages/${generatedPackage.packageId}/download`,
        downloadToken: generatedPackage.downloadToken,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Authorized Press Kit package generation failed", error instanceof Error ? error.message : "unknown_error");
    await notifyPressManualReview(id, profile.organization);
    return NextResponse.json({ error: { code: "package_generation_failed", message: "The request was evaluated, but the package requires staff assistance." } }, { status: 503 });
  }
}
