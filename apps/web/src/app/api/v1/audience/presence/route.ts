import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { audienceInstallations } from "@harborline/backend/schema";
import { getOptionalAccountId } from "@/lib/auth";
import { authenticateDeviceRequest } from "@/lib/device-pairing";

const inputSchema = z.object({
  installationId: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/),
  platform: z.enum(["web", "ios", "android", "tvos", "androidtv", "roku"]),
  source: z
    .enum(["news-site", "mobile-app", "mobile-app-web", "tv-app", "roku-app"])
    .default("news-site"),
  appVersion: z.string().trim().min(1).max(40).optional(),
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

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
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

  let userClerkId: string | null = null;
  try {
    userClerkId = await getOptionalAccountId();
  } catch {
    /* Anonymous presence is still valid. */
  }
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
  await getDb()
    .insert(audienceInstallations)
    .values({
      installationId: parsed.data.installationId,
      platform: parsed.data.platform,
      source: parsed.data.source,
      appVersion: parsed.data.appVersion,
      userClerkId,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: audienceInstallations.installationId,
      set: {
        platform: parsed.data.platform,
        source: parsed.data.source,
        appVersion: parsed.data.appVersion,
        userClerkId: sql`coalesce(${userClerkId}, ${audienceInstallations.userClerkId})`,
        eventCount: sql`${audienceInstallations.eventCount} + 1`,
        lastSeenAt: now,
      },
    });
  console.log(
    JSON.stringify({
      level: "info",
      message: "Audience presence recorded",
      platform: parsed.data.platform,
      duration_ms: Date.now() - startedAt,
    }),
  );
  return json(
    { data: { recorded: true }, meta: { apiVersion: "1" } },
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
  if (hasDatabase())
    await getDb()
      .delete(audienceInstallations)
      .where(
        eq(audienceInstallations.installationId, parsed.data.installationId),
      );
  return new Response(null, { status: 204, headers: corsHeaders });
}
