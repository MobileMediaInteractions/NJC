import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { webPushSubscriptions } from "@harborline/backend/schema";
import { getOptionalAccountId } from "@/lib/auth";
import { authorizeReaderApiRequest } from "@/lib/reader-api-access";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getWebPushConfiguration } from "@/lib/site-notification-delivery";
import {
  webPushSubscriptionSchema,
  webPushUnsubscribeSchema,
} from "@/lib/site-notification-policy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await authorizeReaderApiRequest(request);
  if (access.response) return access.response;
  const configuration = getWebPushConfiguration();
  const configured = hasDatabase() && Boolean(configuration);
  const enabled = configured && (await getSiteConfiguration()).features.alerts;
  let subscribed = false;
  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (configured && endpoint) {
    const parsed = webPushUnsubscribeSchema.safeParse({ endpoint });
    if (parsed.success) {
      const [record] = await getDb()
        .select({ id: webPushSubscriptions.id })
        .from(webPushSubscriptions)
        .where(and(
          eq(webPushSubscriptions.endpoint, parsed.data.endpoint),
          eq(webPushSubscriptions.isActive, true),
          isNull(webPushSubscriptions.revokedAt),
        ))
        .limit(1);
      subscribed = Boolean(record);
    }
  }
  return NextResponse.json({
    data: {
      configured,
      enabled,
      subscribed,
      publicKey: configuration?.publicKey ?? null,
    },
  }, { headers: responseHeaders(access.headers) });
}

export async function POST(request: Request) {
  const access = await authorizeReaderApiRequest(request);
  if (access.response) return access.response;
  const configuration = getWebPushConfiguration();
  if (!hasDatabase() || !configuration) {
    return errorResponse(
      "service_not_configured",
      "Website notifications are not configured",
      503,
      access.headers,
    );
  }
  if (!(await getSiteConfiguration()).features.alerts) {
    return errorResponse(
      "alerts_disabled",
      "Website notifications are currently disabled",
      409,
      access.headers,
    );
  }
  const parsed = webPushSubscriptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "invalid_subscription",
      "A valid browser push subscription is required",
      400,
      access.headers,
    );
  }

  const userClerkId = await getOptionalAccountId();
  const now = new Date();
  const expiration = parsed.data.expirationTime
    ? new Date(parsed.data.expirationTime)
    : null;
  const [record] = await getDb().insert(webPushSubscriptions).values({
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userClerkId,
    userAgentFamily: browserFamily(request.headers.get("user-agent")),
    locale: normalizedLocale(request.headers.get("accept-language")),
    isActive: true,
    failureCount: 0,
    expiresAt: expiration && !Number.isNaN(expiration.getTime()) ? expiration : null,
    revokedAt: null,
    lastSeenAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: webPushSubscriptions.endpoint,
    set: {
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userClerkId,
      userAgentFamily: browserFamily(request.headers.get("user-agent")),
      locale: normalizedLocale(request.headers.get("accept-language")),
      isActive: true,
      failureCount: 0,
      expiresAt: expiration && !Number.isNaN(expiration.getTime()) ? expiration : null,
      revokedAt: null,
      lastSeenAt: now,
      updatedAt: now,
    },
  }).returning({ id: webPushSubscriptions.id });

  return NextResponse.json(
    { data: { subscribed: true, id: record.id } },
    { status: 201, headers: responseHeaders(access.headers) },
  );
}

export async function DELETE(request: Request) {
  const access = await authorizeReaderApiRequest(request);
  if (access.response) return access.response;
  if (!hasDatabase()) {
    return errorResponse(
      "service_not_configured",
      "Website notifications are not configured",
      503,
      access.headers,
    );
  }
  const parsed = webPushUnsubscribeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "invalid_subscription",
      "A valid browser push endpoint is required",
      400,
      access.headers,
    );
  }
  const now = new Date();
  await getDb().update(webPushSubscriptions).set({
    isActive: false,
    userClerkId: null,
    revokedAt: now,
    lastSeenAt: now,
    updatedAt: now,
  }).where(eq(webPushSubscriptions.endpoint, parsed.data.endpoint));
  return NextResponse.json(
    { data: { subscribed: false } },
    { headers: responseHeaders(access.headers) },
  );
}

function responseHeaders(headers?: Headers) {
  const response = new Headers(headers);
  response.set("Cache-Control", "private, no-store");
  response.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  headers?: Headers,
) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: responseHeaders(headers) },
  );
}

function browserFamily(userAgent: string | null) {
  const value = userAgent ?? "";
  if (/Edg\//.test(value)) return "edge";
  if (/Firefox\//.test(value)) return "firefox";
  if (/CriOS|Chrome\//.test(value)) return "chrome";
  if (/Safari\//.test(value)) return "safari";
  return "other";
}

function normalizedLocale(acceptLanguage: string | null) {
  const locale = acceptLanguage?.split(",")[0]?.trim();
  return locale && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(locale)
    ? locale.slice(0, 35)
    : null;
}
