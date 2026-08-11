import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  employeeNotifications,
  pressKitMessages,
  pressKitRequests,
  users,
} from "@harborline/backend/schema";
import type { PressAiExtraction } from "@/lib/press-kit-ai";
import { sendPressKitEmail } from "@/lib/press-kit-email";
import {
  pressRequestProfileSchema,
  type PressRequestProfile,
} from "@/lib/press-kit-policy";

type PressRequestRow = typeof pressKitRequests.$inferSelect;

export function pressRequestToPartialProfile(row: PressRequestRow): Partial<PressRequestProfile> {
  return {
    name: row.name || undefined,
    organization: row.organization || undefined,
    requesterRole: row.requesterRole || undefined,
    email: row.email || undefined,
    requesterWebsite: row.requesterWebsite || "",
    organizationWebsite: row.organizationWebsite || "",
    country: row.country || undefined,
    projectName: row.projectName || undefined,
    requestDetails: row.requestDetails || undefined,
    whereUsed: row.whereUsed || undefined,
    expectedReleaseAt: row.expectedReleaseAt?.toISOString() || "",
    usageClassification: row.usageClassification === "unclassified"
      ? undefined
      : row.usageClassification as PressRequestProfile["usageClassification"],
    requestedAssetIds: row.requestedAssetIds,
    unmatchedMaterials: row.unmatchedMaterials,
  };
}

export function mergePressExtraction(
  current: Partial<PressRequestProfile>,
  extraction: PressAiExtraction,
) {
  const next = { ...current };
  for (const [key, value] of Object.entries(extraction.extracted)) {
    if (value !== null && value !== "") {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  next.requestedAssetIds = [...new Set([
    ...(current.requestedAssetIds ?? []),
    ...extraction.extracted.requestedAssetIds,
  ])];
  next.unmatchedMaterials = [...new Set([
    ...(current.unmatchedMaterials ?? []),
    ...extraction.extracted.unmatchedMaterials,
  ])];
  return next;
}

export function profileDbValues(profile: Partial<PressRequestProfile>) {
  const expectedReleaseAt = profile.expectedReleaseAt
    ? new Date(profile.expectedReleaseAt)
    : null;
  return {
    name: profile.name ?? "",
    organization: profile.organization ?? "",
    requesterRole: profile.requesterRole ?? null,
    email: profile.email ?? "",
    requesterWebsite: profile.requesterWebsite || null,
    organizationWebsite: profile.organizationWebsite || null,
    country: profile.country ?? null,
    projectName: profile.projectName ?? null,
    requestDetails: profile.requestDetails ?? "",
    whereUsed: profile.whereUsed ?? null,
    expectedReleaseAt: expectedReleaseAt && !Number.isNaN(expectedReleaseAt.valueOf())
      ? expectedReleaseAt
      : null,
    usageClassification: profile.usageClassification ?? "unclassified",
    intendedUse: profile.usageClassification ?? "unclassified",
    requestedAssetIds: profile.requestedAssetIds ?? [],
    unmatchedMaterials: profile.unmatchedMaterials ?? [],
    assetGroups: [],
    structuredRequest: profile as Record<string, unknown>,
    updatedAt: new Date(),
  };
}

export function confirmedPressProfile(row: PressRequestRow) {
  return pressRequestProfileSchema.safeParse(pressRequestToPartialProfile(row));
}

export function pressDuplicateKey(profile: PressRequestProfile) {
  return createHash("sha256").update([
    profile.email.trim().toLowerCase(),
    profile.organization.trim().toLowerCase(),
    profile.projectName.trim().toLowerCase(),
    profile.requestDetails.trim().toLowerCase(),
  ].join("\n")).digest("hex");
}

export function serializePressRequest(row: PressRequestRow) {
  return {
    id: row.id,
    status: row.status,
    profile: pressRequestToPartialProfile(row),
    decision: {
      reasons: row.decisionReasons,
      restrictions: row.restrictions,
      licenseType: row.licenseType,
      policyVersion: row.policyVersion,
    },
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    generatedAt: row.generatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function storePressConversationTurn(input: {
  requestId: string;
  requesterMessage: string;
  extraction: PressAiExtraction;
}) {
  const db = getDb();
  await db.insert(pressKitMessages).values([
    {
      requestId: input.requestId,
      role: "requester",
      content: input.requesterMessage,
    },
    {
      requestId: input.requestId,
      role: "assistant",
      content: input.extraction.assistantMessage,
      structuredOutput: input.extraction as unknown as Record<string, unknown>,
      model: input.extraction.model ?? input.extraction.provider,
    },
  ]);
}

export async function notifyPressManualReview(requestId: string, organization: string) {
  if (!hasDatabase()) return;
  const db = getDb();
  const reviewers = await db.select({ clerkId: users.clerkId }).from(users).where(and(
    eq(users.isActive, true),
    inArray(users.role, ["admin", "editor", "producer"]),
  ));
  if (!reviewers.length) return;
  await db.insert(employeeNotifications).values(reviewers.map(({ clerkId }) => ({
    recipientClerkId: clerkId,
    kind: "press_kit_review",
    title: "Press request needs review",
    body: `${organization || "A requester"} submitted a Press Kit request that cannot be decided automatically.`,
    destination: `/studio/press/${requestId}`,
  })));
  const pressContact = process.env.PRESS_CONTACT_EMAIL?.trim();
  if (pressContact) await sendPressKitEmail({
    to: pressContact,
    subject: `Press request ${requestId.slice(0, 8)} needs manual review`,
    text: `${organization || "A requester"} submitted a request that requires a human decision. Review it in Studio: ${process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ?? "https://studio.thejerseycourier.com"}/press/${requestId}`,
    eventId: `${requestId}-staff-review`,
  });
}

export async function readPressRequest(id: string) {
  if (!hasDatabase()) return null;
  const [row] = await getDb().select().from(pressKitRequests)
    .where(eq(pressKitRequests.id, id)).limit(1);
  return row ?? null;
}
