import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { audienceInstallations, audienceInstallationVersions, users } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { pseudonymizeAnalyticsIdentifier } from "@/lib/analytics-privacy";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  platform: z.string().trim().min(1).max(32),
  product: z.string().trim().min(1).max(80),
  releaseChannel: z.string().trim().min(1).max(40),
  environment: z.string().trim().min(1).max(40),
  appVersion: z.string().trim().min(1).max(80),
  buildNumber: z.string().trim().min(1).max(80),
});

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor"].includes(viewer.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Version evidence requires an administrator or editor." } }, { status: 403 });
  }
  if (!hasDatabase()) return NextResponse.json({ error: { code: "database_unavailable", message: "Analytics evidence is unavailable." } }, { status: 503 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a valid application version group." } }, { status: 400 });
  const q = parsed.data;
  const rows = await getDb().select({
    installationId: audienceInstallationVersions.installationId,
    userClerkId: audienceInstallations.userClerkId,
    displayName: users.displayName,
    role: users.role,
    deviceClass: audienceInstallationVersions.deviceClass,
    osVersion: audienceInstallationVersions.osVersion,
    eventCount: audienceInstallationVersions.eventCount,
    firstSeenAt: audienceInstallationVersions.firstSeenAt,
    lastSeenAt: audienceInstallationVersions.lastSeenAt,
    qualityStatus: audienceInstallationVersions.qualityStatus,
  }).from(audienceInstallationVersions)
    .innerJoin(audienceInstallations, eq(audienceInstallations.installationId, audienceInstallationVersions.installationId))
    .leftJoin(users, eq(users.clerkId, audienceInstallations.userClerkId))
    .where(and(
      eq(audienceInstallationVersions.platform, q.platform),
      eq(audienceInstallationVersions.product, q.product),
      eq(audienceInstallationVersions.releaseChannel, q.releaseChannel),
      eq(audienceInstallationVersions.environment, q.environment),
      eq(audienceInstallationVersions.appVersion, q.appVersion),
      eq(audienceInstallationVersions.buildNumber, q.buildNumber),
    )).orderBy(desc(audienceInstallationVersions.lastSeenAt)).limit(250);
  return NextResponse.json({
    group: q,
    privacy: "Installation and account identifiers are one-way pseudonyms. Raw identifiers are never returned.",
    truncated: rows.length === 250,
    evidence: rows.map((row) => ({
      installation: pseudonymizeAnalyticsIdentifier(row.installationId),
      account: row.userClerkId ? { pseudonym: pseudonymizeAnalyticsIdentifier(row.userClerkId), displayName: row.displayName ?? "Linked account", role: row.role ?? "unknown" } : null,
      deviceClass: row.deviceClass ?? "unknown",
      osVersion: row.osVersion ?? "unknown",
      eventCount: row.eventCount,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      qualityStatus: row.qualityStatus,
    })),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
