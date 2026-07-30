import { NextResponse } from "next/server";
import { hasDatabase } from "@harborline/backend/db";
import { requireEmployeeCapability } from "@/lib/employee-auth";
import { resolveNotificationSubscriptions } from "@/lib/site-notification-audience";
import {
  notificationAudienceAllowed,
  notificationCampaignDraftSchema,
} from "@/lib/site-notification-policy";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("tools:alerts");
  if (!viewer) {
    return response(
      { error: { code: "forbidden", message: "Alert-tools permission is required" } },
      403,
    );
  }
  if (!hasDatabase()) {
    return response(
      { error: { code: "service_not_configured", message: "Postgres is required for audience preflight" } },
      503,
    );
  }

  const parsed = notificationCampaignDraftSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return response({
      error: {
        code: "invalid_request",
        message: "Review the notification content, audience, and destination",
        details: parsed.error.flatten(),
      },
    }, 400);
  }

  const configuration = await getSiteConfiguration();
  if (!configuration.features.alerts || !configuration.studio.notifications.deliveryEnabled) {
    return response(
      { error: { code: "alerts_disabled", message: "Notification delivery is disabled in Configuration" } },
      409,
    );
  }
  if (!notificationAudienceAllowed(
    parsed.data.audience,
    configuration.studio.notifications,
  )) {
    return response(
      { error: { code: "audience_disabled", message: "This notification audience is disabled in Configuration" } },
      409,
    );
  }

  const resolved = await resolveNotificationSubscriptions(parsed.data.audience);
  return response({
    data: {
      recipients: resolved.recipientCount,
      subscriptions: resolved.subscriptions.length,
      destination: parsed.data.destination,
      ready: resolved.subscriptions.length > 0,
    },
    meta: { apiVersion: "1" },
  });
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
