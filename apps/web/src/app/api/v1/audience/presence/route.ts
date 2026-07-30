import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  audienceInstallations,
  audienceInstallationVersions,
  audiencePresenceEvents,
} from "@harborline/backend/schema";
import {
  getAnalyticsRequestContext,
  getWebApplicationIdentity,
} from "@/lib/analytics-request-context";
import {
  authenticateDeviceRequest,
  normalizeDevicePayload,
} from "@/lib/device-pairing";

const inputSchema = z.object({
  eventId: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/).optional(),
  installationId: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/),
  platform: z.enum(["web", "ios", "android", "tvos", "androidtv", "roku"]),
  source: z
    .enum([
      "news-site",
      "mobile-app",
      "mobile-app-web",
      "employee-app",
      "tv-app",
      "roku-app",
    ])
    .default("news-site"),
  product: z
    .enum(["news-web", "reader-mobile", "employee-mobile", "reader-tv", "reader-roku"])
    .optional(),
  appVersion: z.string().trim().min(1).max(40).optional(),
  buildNumber: z.string().trim().min(1).max(80).optional(),
  releaseChannel: z.enum(["production", "beta", "alpha", "development"]).optional(),
  osVersion: z.string().trim().min(1).max(80).optional(),
  deviceClass: z.enum(["browser", "phone", "tablet", "tv", "unknown"]).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(corsHeaders))
    headers.set(key, value);
  return NextResponse.json(body, { ...init, headers });
}

function productForSource(source: z.infer<typeof inputSchema>["source"]) {
  if (source === "news-site") return "news-web";
  if (source === "employee-app") return "employee-mobile";
  if (source === "tv-app") return "reader-tv";
  if (source === "roku-app") return "reader-roku";
  return "reader-mobile";
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = inputSchema.safeParse(
    normalizeDevicePayload(await request.json().catch(() => null), [
      "eventId",
      "installationId",
      "platform",
      "source",
      "product",
      "appVersion",
      "buildNumber",
      "releaseChannel",
      "osVersion",
      "deviceClass",
      "occurredAt",
    ]),
  );
  if (!parsed.success)
    return json(
      {
        error: {
          code: "invalid_request",
          message: "Invalid audience presence payload",
        },
      },
      { status: 400 },
    );
  if (!hasDatabase())
    return json(
      {
        data: { recorded: false },
        meta: { apiVersion: "1", database: "not configured" },
      },
      { status: 202 },
    );

  const context = await getAnalyticsRequestContext();
  let userClerkId = context.userClerkId;
  if (
    !userClerkId &&
    (["tvos", "androidtv", "roku"] as const).includes(
      parsed.data.platform as "tvos" | "androidtv" | "roku",
    )
  ) {
    try {
      userClerkId =
        (await authenticateDeviceRequest(request))?.userClerkId ?? null;
    } catch {
      /* Anonymous TV presence is still valid. */
    }
  }
  const now = new Date();
  const occurredAt = parsed.data.occurredAt
    ? new Date(parsed.data.occurredAt)
    : now;
  const suppliedEventId = Boolean(parsed.data.eventId);
  const eventId = parsed.data.eventId ?? `legacy_${randomUUID()}`;
  const product = parsed.data.product ?? productForSource(parsed.data.source);
  const webIdentity = product === "news-web" ? getWebApplicationIdentity() : null;
  const appVersion =
    webIdentity?.appVersion ?? parsed.data.appVersion ?? "unknown";
  const buildNumber =
    webIdentity?.buildNumber ?? parsed.data.buildNumber ?? "unknown";
  const releaseChannel =
    webIdentity?.releaseChannel ?? parsed.data.releaseChannel ?? "production";
  const environment = context.environment;
  const qualityStatus = suppliedEventId ? "verified" : "legacy";
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [event] = await tx
      .insert(audiencePresenceEvents)
      .values({
        eventId,
        installationId: parsed.data.installationId,
        platform: parsed.data.platform,
        product,
        releaseChannel,
        appVersion,
        buildNumber,
        osVersion: parsed.data.osVersion,
        deviceClass: parsed.data.deviceClass ?? "unknown",
        environment,
        qualityStatus,
        userClerkId,
        occurredAt,
        receivedAt: now,
      })
      .onConflictDoNothing({ target: audiencePresenceEvents.eventId })
      .returning({ id: audiencePresenceEvents.id });
    if (!event) return { recorded: false as const, deduplicated: true as const };

    await tx
      .insert(audienceInstallations)
      .values({
        installationId: parsed.data.installationId,
        platform: parsed.data.platform,
        source: parsed.data.source,
        product,
        releaseChannel,
        appVersion,
        buildNumber,
        osVersion: parsed.data.osVersion,
        deviceClass: parsed.data.deviceClass ?? "unknown",
        environment,
        qualityStatus,
        userClerkId,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: audienceInstallations.installationId,
        set: {
          platform: parsed.data.platform,
          source: parsed.data.source,
          product,
          releaseChannel,
          appVersion,
          buildNumber,
          osVersion: parsed.data.osVersion,
          deviceClass: parsed.data.deviceClass ?? "unknown",
          environment,
          qualityStatus: sql`case when ${qualityStatus} = 'verified' then 'verified' else ${audienceInstallations.qualityStatus} end`,
          userClerkId: sql`coalesce(${userClerkId}, ${audienceInstallations.userClerkId})`,
          eventCount: sql`${audienceInstallations.eventCount} + 1`,
          lastSeenAt: now,
        },
      });
    await tx
      .insert(audienceInstallationVersions)
      .values({
        installationId: parsed.data.installationId,
        platform: parsed.data.platform,
        product,
        releaseChannel,
        appVersion,
        buildNumber,
        osVersion: parsed.data.osVersion,
        deviceClass: parsed.data.deviceClass ?? "unknown",
        environment,
        qualityStatus,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [
          audienceInstallationVersions.installationId,
          audienceInstallationVersions.product,
          audienceInstallationVersions.releaseChannel,
          audienceInstallationVersions.appVersion,
          audienceInstallationVersions.buildNumber,
        ],
        set: {
          platform: parsed.data.platform,
          osVersion: parsed.data.osVersion,
          deviceClass: parsed.data.deviceClass ?? "unknown",
          environment,
          qualityStatus: sql`case when ${qualityStatus} = 'verified' then 'verified' else ${audienceInstallationVersions.qualityStatus} end`,
          eventCount: sql`${audienceInstallationVersions.eventCount} + 1`,
          lastSeenAt: now,
        },
      });
    return { recorded: true as const, deduplicated: false as const };
  });
  console.log(
    JSON.stringify({
      level: "info",
      message: "Audience presence recorded",
      platform: parsed.data.platform,
      product,
      releaseChannel,
      appVersion,
      buildNumber,
      environment,
      qualityStatus,
      deduplicated: result.deduplicated,
      duration_ms: Date.now() - startedAt,
    }),
  );
  return json(
    {
      data: result,
      meta: { apiVersion: "1", calculationVersion: 2, qualityStatus },
    },
    { status: 202 },
  );
}

export async function DELETE(request: Request) {
  const parsed = inputSchema
    .pick({ installationId: true })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return json(
      {
        error: {
          code: "invalid_request",
          message: "A valid installation ID is required",
        },
      },
      { status: 400 },
    );
  if (hasDatabase()) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .delete(audiencePresenceEvents)
        .where(eq(audiencePresenceEvents.installationId, parsed.data.installationId));
      await tx
        .delete(audienceInstallationVersions)
        .where(eq(audienceInstallationVersions.installationId, parsed.data.installationId));
      await tx
        .delete(audienceInstallations)
        .where(eq(audienceInstallations.installationId, parsed.data.installationId));
    });
  }
  return new Response(null, { status: 204, headers: corsHeaders });
}
