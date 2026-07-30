import { createHash } from "node:crypto";
import { and, asc, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  analyticsArchiveRevisions,
  analyticsEvents,
  audienceInstallations,
  audienceInstallationVersions,
  audiencePresenceEvents,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  dataset: z
    .enum(["page-events", "presence-events", "installations", "versions", "archives"])
    .default("page-events"),
  days: z.coerce.number().int().min(1).max(366).default(30),
});

function pseudonymize(value: string | null) {
  if (!value) return "";
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function csvCell(value: unknown) {
  if (value == null) return "";
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function csv(rows: Array<Record<string, unknown>>) {
  const columns = rows.length
    ? Object.keys(rows[0]!)
    : ["status"];
  const normalized = rows.length ? rows : [{ status: "No matching records" }];
  return [
    columns.map(csvCell).join(","),
    ...normalized.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor"].includes(viewer.role)) {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Analytics evidence export requires an administrator or editor.",
        },
      },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      {
        error: {
          code: "database_unavailable",
          message: "The analytics database is not configured.",
        },
      },
      { status: 503 },
    );
  }
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Choose a valid analytics export." } },
      { status: 400 },
    );
  }

  const until = new Date();
  const since = new Date(until.getTime() - parsed.data.days * 86_400_000);
  const db = getDb();
  let rows: Array<Record<string, unknown>>;

  if (parsed.data.dataset === "page-events") {
    const values = await db
      .select()
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.receivedAt, since), lte(analyticsEvents.receivedAt, until)))
      .orderBy(asc(analyticsEvents.receivedAt))
      .limit(10_000);
    rows = values.map((item) => ({
      eventId: item.eventId,
      calculationVersion: item.calculationVersion,
      qualityStatus: item.qualityStatus,
      environment: item.environment,
      product: item.product,
      platform: item.platform,
      installation: pseudonymize(item.installationId),
      session: pseudonymize(item.sessionId),
      pathname: item.pathname,
      storySlug: item.storySlug,
      trafficSource: item.trafficSource,
      attributionModel: item.attributionModel,
      devicePlatform: item.devicePlatform,
      isEntry: item.isEntry,
      appVersion: item.appVersion,
      buildNumber: item.buildNumber,
      releaseChannel: item.releaseChannel,
      occurredAt: item.occurredAt,
      receivedAt: item.receivedAt,
    }));
  } else if (parsed.data.dataset === "presence-events") {
    const values = await db
      .select()
      .from(audiencePresenceEvents)
      .where(and(
        gte(audiencePresenceEvents.receivedAt, since),
        lte(audiencePresenceEvents.receivedAt, until),
      ))
      .orderBy(asc(audiencePresenceEvents.receivedAt))
      .limit(10_000);
    rows = values.map((item) => ({
      eventId: item.eventId,
      installation: pseudonymize(item.installationId),
      account: pseudonymize(item.userClerkId),
      platform: item.platform,
      product: item.product,
      releaseChannel: item.releaseChannel,
      appVersion: item.appVersion,
      buildNumber: item.buildNumber,
      osVersion: item.osVersion,
      deviceClass: item.deviceClass,
      environment: item.environment,
      qualityStatus: item.qualityStatus,
      occurredAt: item.occurredAt,
      receivedAt: item.receivedAt,
    }));
  } else if (parsed.data.dataset === "installations") {
    const values = await db
      .select()
      .from(audienceInstallations)
      .where(and(
        gte(audienceInstallations.lastSeenAt, since),
        lte(audienceInstallations.lastSeenAt, until),
      ))
      .orderBy(asc(audienceInstallations.firstSeenAt))
      .limit(10_000);
    rows = values.map((item) => ({
      installation: pseudonymize(item.installationId),
      accountLinked: Boolean(item.userClerkId),
      platform: item.platform,
      source: item.source,
      product: item.product,
      releaseChannel: item.releaseChannel,
      appVersion: item.appVersion,
      buildNumber: item.buildNumber,
      osVersion: item.osVersion,
      deviceClass: item.deviceClass,
      environment: item.environment,
      qualityStatus: item.qualityStatus,
      eventCount: item.eventCount,
      firstSeenAt: item.firstSeenAt,
      lastSeenAt: item.lastSeenAt,
    }));
  } else if (parsed.data.dataset === "versions") {
    const values = await db
      .select()
      .from(audienceInstallationVersions)
      .where(and(
        gte(audienceInstallationVersions.lastSeenAt, since),
        lte(audienceInstallationVersions.lastSeenAt, until),
      ))
      .orderBy(asc(audienceInstallationVersions.firstSeenAt))
      .limit(10_000);
    rows = values.map((item) => ({
      installation: pseudonymize(item.installationId),
      platform: item.platform,
      product: item.product,
      releaseChannel: item.releaseChannel,
      appVersion: item.appVersion,
      buildNumber: item.buildNumber,
      osVersion: item.osVersion,
      deviceClass: item.deviceClass,
      environment: item.environment,
      qualityStatus: item.qualityStatus,
      eventCount: item.eventCount,
      firstSeenAt: item.firstSeenAt,
      lastSeenAt: item.lastSeenAt,
    }));
  } else {
    const values = await db
      .select()
      .from(analyticsArchiveRevisions)
      .where(and(
        gte(analyticsArchiveRevisions.generatedAt, since),
        lte(analyticsArchiveRevisions.generatedAt, until),
      ))
      .orderBy(asc(analyticsArchiveRevisions.periodStart), asc(analyticsArchiveRevisions.revision))
      .limit(10_000);
    rows = values.map((item) => ({
      period: item.period,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      revision: item.revision,
      calculationVersion: item.calculationVersion,
      qualityStatus: item.qualityStatus,
      correctionReason: item.correctionReason,
      totalViews: item.totalViews,
      storyViews: item.storyViews,
      pathViews: item.pathViews,
      sourceViews: item.sourceViews,
      deviceViews: item.deviceViews,
      generatedAt: item.generatedAt,
    }));
  }

  const filename = `njc-analytics-${parsed.data.dataset}-${until.toISOString().slice(0, 10)}.csv`;
  return new Response(csv(rows), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
