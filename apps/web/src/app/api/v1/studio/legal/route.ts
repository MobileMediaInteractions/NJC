import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { apiAuditLogs, legalCenterEntries } from "@harborline/backend/schema";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import { legalEntryInput, legalSeverityPolicy } from "@/lib/legal-center";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  if (!canManageSiteSettings(viewer.role))
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Administrator access is required to manage legal language",
        },
      },
      { status: 403 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      {
        error: {
          code: "service_not_configured",
          message: "Postgres is required to manage legal language",
        },
      },
      { status: 503 },
    );

  const entries = await getDb()
    .select()
    .from(legalCenterEntries)
    .orderBy(
      asc(legalCenterEntries.sortOrder),
      asc(legalCenterEntries.title),
    );
  return NextResponse.json({
    data: entries,
    meta: { apiVersion: "1", severityPolicy: legalSeverityPolicy },
  });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  if (!canManageSiteSettings(viewer.role))
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Administrator access is required to add legal language",
        },
      },
      { status: 403 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      {
        error: {
          code: "service_not_configured",
          message: "Postgres is required to save legal language",
        },
      },
      { status: 503 },
    );

  const parsed = legalEntryInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Review the legal entry fields",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );

  const [conflict] = await getDb()
    .select({ id: legalCenterEntries.id })
    .from(legalCenterEntries)
    .where(eq(legalCenterEntries.slug, parsed.data.slug))
    .limit(1);
  if (conflict)
    return NextResponse.json(
      {
        error: {
          code: "slug_conflict",
          message: "A legal entry already uses this identifier",
        },
      },
      { status: 409 },
    );

  try {
    const entry = await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(legalCenterEntries)
        .values({
          ...parsed.data,
          status: "draft",
          createdByClerkId: viewer.id,
          updatedByClerkId: viewer.id,
        })
        .returning();
      if (!created)
        throw new Error("Legal entry was not returned after creation");
      await tx.insert(apiAuditLogs).values(
        requiredAuditRecord(request, viewer.id, "legal.entry_created", {
          legalEntryId: created.id,
          slug: created.slug,
          severity: created.severity,
        }),
      );
      return created;
    });
    return NextResponse.json(
      { data: entry, meta: { apiVersion: "1" } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Legal entry creation failed", { actorId: viewer.id, error });
    return NextResponse.json(
      {
        error: {
          code: "save_failed",
          message: "The legal draft could not be created",
        },
      },
      { status: 500 },
    );
  }
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
