import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { notificationCampaigns } from "@harborline/backend/schema";
import {
  requireEmployeeCapability,
  writeEmployeeAudit,
} from "@/lib/employee-auth";
import { createRedisClient } from "@/lib/redis";
import { getSiteConfiguration } from "@/lib/site-settings";
import { resolveNotificationSubscriptions } from "@/lib/site-notification-audience";
import {
  assertCampaignSize,
  deliverNotificationCampaign,
  getWebPushConfiguration,
  NotificationDeliveryError,
} from "@/lib/site-notification-delivery";
import {
  notificationAudienceSpec,
  notificationCampaignInputSchema,
} from "@/lib/site-notification-policy";

export const dynamic = "force-dynamic";

let campaignLimiter: Ratelimit | null = null;
const localCampaignLimits = new Map<string, { count: number; resetAt: number }>();

export async function GET() {
  const viewer = await requireEmployeeCapability("tools:alerts");
  if (!viewer) {
    return errorResponse(
      "forbidden",
      "Alert-tools permission is required",
      403,
    );
  }
  if (!hasDatabase()) {
    return errorResponse(
      "service_not_configured",
      "Postgres is required for notification campaigns",
      503,
    );
  }
  const data = await getDb()
    .select()
    .from(notificationCampaigns)
    .orderBy(desc(notificationCampaigns.createdAt))
    .limit(50);
  return NextResponse.json(
    { data, meta: { apiVersion: "1" } },
    { headers: privateHeaders() },
  );
}

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("tools:alerts");
  if (!viewer) {
    return errorResponse(
      "forbidden",
      "Alert-tools permission is required",
      403,
    );
  }
  if (!hasDatabase()) {
    return errorResponse(
      "service_not_configured",
      "Postgres is required for notification campaigns",
      503,
    );
  }
  if (!getWebPushConfiguration()) {
    return errorResponse(
      "push_not_configured",
      "Website push delivery is not configured",
      503,
    );
  }
  if (!(await getSiteConfiguration()).features.alerts) {
    return errorResponse(
      "alerts_disabled",
      "Enable Breaking-news alerts in Studio Configuration before sending",
      409,
    );
  }
  const limit = await limitCampaigns(viewer.id);
  if (!limit.allowed) {
    const headers = privateHeaders();
    headers.set("Retry-After", String(limit.retryAfter));
    return NextResponse.json(
      { error: { code: "rate_limit_exceeded", message: "Too many notification campaigns were requested" } },
      { status: 429, headers },
    );
  }

  const parsed = notificationCampaignInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({
      error: {
        code: "invalid_request",
        message: "Review the notification content, audience, and confirmation",
        details: parsed.error.flatten(),
      },
    }, { status: 400, headers: privateHeaders() });
  }

  let campaignId: string | null = null;
  try {
    const resolved = await resolveNotificationSubscriptions(parsed.data.audience);
    assertCampaignSize(resolved.subscriptions.length);
    if (resolved.subscriptions.length === 0) {
      return errorResponse(
        "no_subscribers",
        "No active website notification subscriptions match this audience",
        409,
      );
    }

    const [campaign] = await getDb().insert(notificationCampaigns).values({
      title: parsed.data.title,
      body: parsed.data.body,
      destination: parsed.data.destination,
      audienceType: parsed.data.audience.type,
      audienceSpec: notificationAudienceSpec(parsed.data.audience),
      status: "sending",
      createdByClerkId: viewer.id,
      recipientCount: resolved.recipientCount,
      subscriptionCount: resolved.subscriptions.length,
    }).returning();
    campaignId = campaign.id;

    const delivery = await deliverNotificationCampaign({
      campaignId: campaign.id,
      title: campaign.title,
      body: campaign.body,
      destination: campaign.destination,
      subscriptions: resolved.subscriptions,
    });
    const [completedCampaign] = await getDb()
      .select()
      .from(notificationCampaigns)
      .where(eq(notificationCampaigns.id, campaign.id))
      .limit(1);

    await writeEmployeeAudit(
      request,
      viewer,
      "site_notification.sent",
      { type: "notification_campaign", id: campaign.id },
      {
        audienceType: parsed.data.audience.type,
        recipientCount: resolved.recipientCount,
        subscriptionCount: resolved.subscriptions.length,
        acceptedCount: delivery.accepted,
        failedCount: delivery.failed,
        destination: parsed.data.destination,
      },
    );

    return NextResponse.json({
      data: {
        campaign: completedCampaign ?? campaign,
        summary: {
          recipients: resolved.recipientCount,
          subscriptions: resolved.subscriptions.length,
          accepted: delivery.accepted,
          failed: delivery.failed,
        },
      },
      meta: { apiVersion: "1" },
    }, {
      status: 201,
      headers: privateHeaders(),
    });
  } catch (error) {
    if (campaignId) {
      await getDb().update(notificationCampaigns).set({
        status: "failed",
        completedAt: new Date(),
      }).where(eq(notificationCampaigns.id, campaignId)).catch((updateError) => {
        console.error("Notification campaign failure status could not be saved", {
          campaignId,
          updateError,
        });
      });
      await writeEmployeeAudit(
        request,
        viewer,
        "site_notification.failed",
        { type: "notification_campaign", id: campaignId },
      ).catch((auditError) => {
        console.error("Notification campaign failure audit could not be saved", {
          campaignId,
          auditError,
        });
      });
    }
    if (error instanceof NotificationDeliveryError) {
      return errorResponse(
        error.code,
        error.message,
        error.code === "audience_too_large" ? 413 : 503,
      );
    }
    console.error("Website notification campaign failed", {
      actorId: viewer.id,
      error,
    });
    return errorResponse(
      "campaign_failed",
      "The notification campaign could not be completed",
      500,
    );
  }
}

function privateHeaders() {
  return new Headers({
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: privateHeaders() },
  );
}

async function limitCampaigns(userClerkId: string) {
  const redis = createRedisClient();
  if (redis) {
    campaignLimiter ??= new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "njc:site-notifications",
    });
    const result = await campaignLimiter.limit(userClerkId);
    return {
      allowed: result.success,
      retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000)),
    };
  }

  const now = Date.now();
  const key = createHash("sha256").update(userClerkId).digest("hex");
  const previous = localCampaignLimits.get(key);
  const current = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + 10 * 60_000 }
    : previous;
  current.count += 1;
  localCampaignLimits.set(key, current);
  return {
    allowed: current.count <= 10,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
  };
}
