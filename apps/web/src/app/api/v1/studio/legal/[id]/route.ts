import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  apiAuditLogs,
  legalCenterEntries,
  type LegalPublishedSnapshot,
} from "@harborline/backend/schema";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import {
  canSelfPublishLegalEntry,
  legalConfirmationPhrase,
  legalEntryUpdateInput,
  legalSeverityPolicy,
  legalSeveritySchema,
  legalVerificationInput,
  missingLegalVerificationChecks,
} from "@/lib/legal-center";

const legalEntryId = z.uuid();

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireLegalAdministrator();
  if (!access.ok) return access.response;

  const parsedId = legalEntryId.safeParse((await context.params).id);
  const parsedBody = legalEntryUpdateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedId.success || !parsedBody.success)
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Review the legal entry fields",
          details: parsedBody.success
            ? undefined
            : parsedBody.error.flatten(),
        },
      },
      { status: 400 },
    );

  const [current] = await getDb()
    .select()
    .from(legalCenterEntries)
    .where(eq(legalCenterEntries.id, parsedId.data))
    .limit(1);
  if (!current)
    return NextResponse.json(
      { error: { code: "not_found", message: "Legal entry not found" } },
      { status: 404 },
    );
  if (current.status === "review")
    return NextResponse.json(
      {
        error: {
          code: "review_locked",
          message:
            "Return this entry to draft before changing language under review",
        },
      },
      { status: 409 },
    );
  if (current.publishedSnapshot && parsedBody.data.slug !== current.slug)
    return NextResponse.json(
      {
        error: {
          code: "published_identifier_locked",
          message:
            "The identifier is locked after first publication so existing legal links remain stable",
        },
      },
      { status: 409 },
    );

  const [slugConflict] = await getDb()
    .select({ id: legalCenterEntries.id })
    .from(legalCenterEntries)
    .where(
      and(
        eq(legalCenterEntries.slug, parsedBody.data.slug),
        ne(legalCenterEntries.id, current.id),
      ),
    )
    .limit(1);
  if (slugConflict)
    return NextResponse.json(
      {
        error: {
          code: "slug_conflict",
          message: "A legal entry already uses this identifier",
        },
      },
      { status: 409 },
    );

  const expectedUpdatedAt = new Date(parsedBody.data.expectedUpdatedAt);
  const { expectedUpdatedAt: _expectedUpdatedAt, ...values } = parsedBody.data;
  void _expectedUpdatedAt;
  const now = new Date();
  try {
    const updated = await getDb().transaction(async (tx) => {
      const [record] = await tx
        .update(legalCenterEntries)
        .set({
          ...values,
          status: "draft",
          verificationChecks: [],
          submittedByClerkId: null,
          approvedByClerkId: null,
          reviewRequestedAt: null,
          updatedByClerkId: access.viewer.id,
          updatedAt: now,
        })
        .where(
          and(
            eq(legalCenterEntries.id, current.id),
            eq(legalCenterEntries.updatedAt, expectedUpdatedAt),
          ),
        )
        .returning();
      if (!record) return null;
      await tx.insert(apiAuditLogs).values(
        requiredAuditRecord(
          request,
          access.viewer.id,
          "legal.entry_draft_updated",
          {
            legalEntryId: record.id,
            slug: record.slug,
            severity: record.severity,
            priorPublicRevision: record.publishedRevision,
          },
        ),
      );
      return record;
    });
    if (!updated) return conflictResponse();
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Legal entry update failed", {
      actorId: access.viewer.id,
      legalEntryId: current.id,
      error,
    });
    return NextResponse.json(
      {
        error: {
          code: "save_failed",
          message: "The legal draft could not be saved",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireLegalAdministrator();
  if (!access.ok) return access.response;

  const parsedId = legalEntryId.safeParse((await context.params).id);
  const parsedBody = legalVerificationInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedId.success || !parsedBody.success)
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Choose a valid legal verification action",
          details: parsedBody.success
            ? undefined
            : parsedBody.error.flatten(),
        },
      },
      { status: 400 },
    );

  const [current] = await getDb()
    .select()
    .from(legalCenterEntries)
    .where(eq(legalCenterEntries.id, parsedId.data))
    .limit(1);
  if (!current)
    return NextResponse.json(
      { error: { code: "not_found", message: "Legal entry not found" } },
      { status: 404 },
    );

  const expectedUpdatedAt = new Date(parsedBody.data.expectedUpdatedAt);
  const now = new Date();

  if (parsedBody.data.action === "return_to_draft") {
    if (current.status !== "review")
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Only an entry awaiting review can be returned to draft",
          },
        },
        { status: 409 },
      );
    const returnReason = parsedBody.data.reason;
    const updated = await getDb().transaction(async (tx) => {
      const [record] = await tx
        .update(legalCenterEntries)
        .set({
          status: "draft",
          verificationChecks: [],
          submittedByClerkId: null,
          approvedByClerkId: null,
          reviewRequestedAt: null,
          updatedByClerkId: access.viewer.id,
          updatedAt: now,
        })
        .where(
          and(
            eq(legalCenterEntries.id, current.id),
            eq(legalCenterEntries.updatedAt, expectedUpdatedAt),
          ),
        )
        .returning();
      if (!record) return null;
      await tx.insert(apiAuditLogs).values(
        requiredAuditRecord(
          request,
          access.viewer.id,
          "legal.review_returned",
          {
            legalEntryId: current.id,
            slug: current.slug,
            reason: returnReason,
          },
        ),
      );
      return record;
    });
    if (!updated) return conflictResponse();
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  }

  const severity = legalSeveritySchema.parse(current.severity);

  if (parsedBody.data.action === "submit") {
    if (current.status !== "draft")
      return NextResponse.json(
        {
          error: {
            code: "invalid_transition",
            message: "Only a legal draft can enter verification",
          },
        },
        { status: 409 },
      );
    const missing = missingLegalVerificationChecks(
      severity,
      parsedBody.data.checks,
    );
    if (missing.length)
      return NextResponse.json(
        {
          error: {
            code: "verification_incomplete",
            message: `Complete all ${missing.length} remaining ${severity} verification checks`,
            details: { missing: missing.map((requirement) => requirement.id) },
          },
        },
        { status: 409 },
      );
    const verifiedChecks = legalSeverityPolicy[severity].requirements.map(
      (requirement) => requirement.id,
    );
    if (
      parsedBody.data.confirmation !==
      legalConfirmationPhrase(current.slug, "submit")
    )
      return NextResponse.json(
        {
          error: {
            code: "confirmation_mismatch",
            message: "Enter the exact legal publication confirmation",
          },
        },
        { status: 409 },
      );

    if (!canSelfPublishLegalEntry(severity)) {
      const updated = await getDb().transaction(async (tx) => {
        const [record] = await tx
          .update(legalCenterEntries)
          .set({
            status: "review",
            verificationChecks: verifiedChecks,
            submittedByClerkId: access.viewer.id,
            approvedByClerkId: null,
            reviewRequestedAt: now,
            updatedByClerkId: access.viewer.id,
            updatedAt: now,
          })
          .where(
            and(
              eq(legalCenterEntries.id, current.id),
              eq(legalCenterEntries.updatedAt, expectedUpdatedAt),
            ),
          )
          .returning();
        if (!record) return null;
        await tx.insert(apiAuditLogs).values(
          requiredAuditRecord(
            request,
            access.viewer.id,
            "legal.critical_review_requested",
            {
              legalEntryId: current.id,
              slug: current.slug,
              severity,
              verificationChecks: verifiedChecks,
            },
          ),
        );
        return record;
      });
      if (!updated) return conflictResponse();
      return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
    }

    return publishLegalEntry({
      current,
      actorId: access.viewer.id,
      expectedUpdatedAt,
      checks: verifiedChecks,
      request,
      now,
      event: "legal.entry_verified_and_published",
    });
  }

  if (current.status !== "review" || severity !== "critical")
    return NextResponse.json(
      {
        error: {
          code: "invalid_transition",
          message: "Only a critical entry awaiting review can be approved",
        },
      },
      { status: 409 },
    );
  if (current.submittedByClerkId === access.viewer.id)
    return NextResponse.json(
      {
        error: {
          code: "independent_approval_required",
          message:
            "Critical legal language must be approved by a different administrator",
        },
      },
      { status: 403 },
    );
  if (
    parsedBody.data.confirmation !==
    legalConfirmationPhrase(current.slug, "approve")
  )
    return NextResponse.json(
      {
        error: {
          code: "confirmation_mismatch",
          message: "Enter the exact independent approval confirmation",
        },
      },
      { status: 409 },
    );

  const missing = missingLegalVerificationChecks(
    severity,
    current.verificationChecks,
  );
  if (missing.length)
    return NextResponse.json(
      {
        error: {
          code: "verification_incomplete",
          message:
            "The submitted critical verification record is incomplete; return it to draft",
        },
      },
      { status: 409 },
    );

  return publishLegalEntry({
    current,
    actorId: access.viewer.id,
    expectedUpdatedAt,
    checks: current.verificationChecks,
    request,
    now,
    event: "legal.critical_entry_approved_and_published",
  });
}

async function publishLegalEntry({
  current,
  actorId,
  expectedUpdatedAt,
  checks,
  request,
  now,
  event,
}: {
  current: typeof legalCenterEntries.$inferSelect;
  actorId: string;
  expectedUpdatedAt: Date;
  checks: string[];
  request: Request;
  now: Date;
  event: string;
}) {
  const revision = current.publishedRevision + 1;
  const snapshot: LegalPublishedSnapshot = {
    title: current.title,
    summary: current.summary,
    body: current.body,
    severity: legalSeveritySchema.parse(current.severity),
    revision,
    publishedAt: now.toISOString(),
  };
  const updated = await getDb().transaction(async (tx) => {
    const [record] = await tx
      .update(legalCenterEntries)
      .set({
        status: "published",
        verificationChecks: checks,
        submittedByClerkId: current.submittedByClerkId ?? actorId,
        approvedByClerkId: actorId,
        publishedRevision: revision,
        publishedSnapshot: snapshot,
        publishedAt: now,
        updatedByClerkId: actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(legalCenterEntries.id, current.id),
          eq(legalCenterEntries.updatedAt, expectedUpdatedAt),
        ),
      )
      .returning();
    if (!record) return null;
    await tx.insert(apiAuditLogs).values(
      requiredAuditRecord(request, actorId, event, {
        legalEntryId: current.id,
        slug: current.slug,
        severity: current.severity,
        revision,
        verificationChecks: checks,
        submittedByClerkId: record.submittedByClerkId,
        approvedByClerkId: record.approvedByClerkId,
      }),
    );
    return record;
  });
  if (!updated) return conflictResponse();
  revalidatePath("/legal");
  return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
}

async function requireLegalAdministrator() {
  const viewer = await getStudioUser();
  if (!viewer)
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: { code: "unauthorized", message: "Newsroom sign-in required" },
        },
        { status: 401 },
      ),
    };
  if (!canManageSiteSettings(viewer.role))
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: {
            code: "forbidden",
            message:
              "Administrator access is required to manage legal language",
          },
        },
        { status: 403 },
      ),
    };
  if (!hasDatabase())
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: {
            code: "service_not_configured",
            message: "Postgres is required to manage legal language",
          },
        },
        { status: 503 },
      ),
    };
  return { ok: true as const, viewer };
}

function conflictResponse() {
  return NextResponse.json(
    {
      error: {
        code: "conflict",
        message:
          "This legal entry changed in another session. Reload before continuing.",
      },
    },
    { status: 409 },
  );
}

function requiredAuditRecord(
  request: Request,
  actorClerkId: string,
  event: string,
  metadata: Record<string, unknown>,
) {
  return {
    actorClerkId,
    event,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent"),
    metadata,
  };
}
