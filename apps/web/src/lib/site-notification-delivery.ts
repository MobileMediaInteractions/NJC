import "server-only";

import { eq, sql } from "drizzle-orm";
import webPush, { WebPushError } from "web-push";
import { getDb } from "@harborline/backend/db";
import {
  notificationCampaigns,
  notificationDeliveries,
  webPushSubscriptions,
} from "@harborline/backend/schema";
import type { NotificationSubscriptionTarget } from "@/lib/site-notification-audience";

const maximumCampaignSubscriptions = 1_000;
const deliveryConcurrency = 10;

export type WebPushConfiguration = {
  publicKey: string;
  privateKey: string;
  contact: string;
};

export function getWebPushConfiguration(): WebPushConfiguration | null {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const contact = process.env.WEB_PUSH_CONTACT?.trim();
  if (
    !publicKey ||
    !privateKey ||
    !contact ||
    !/^[A-Za-z0-9_-]{40,}$/.test(publicKey) ||
    !/^[A-Za-z0-9_-]{40,}$/.test(privateKey) ||
    !/^(?:mailto:|https:\/\/)/i.test(contact)
  ) {
    return null;
  }
  return { publicKey, privateKey, contact };
}

export function assertCampaignSize(subscriptionCount: number) {
  if (subscriptionCount > maximumCampaignSubscriptions) {
    throw new NotificationDeliveryError(
      "audience_too_large",
      `This campaign resolves to more than ${maximumCampaignSubscriptions.toLocaleString()} browser subscriptions. Split the audience before sending.`,
    );
  }
}

export async function deliverNotificationCampaign(input: {
  campaignId: string;
  title: string;
  body: string;
  destination: string;
  subscriptions: NotificationSubscriptionTarget[];
  cleanupStaleSubscriptions?: boolean;
}) {
  const configuration = getWebPushConfiguration();
  if (!configuration) {
    throw new NotificationDeliveryError(
      "push_not_configured",
      "Website push delivery is not configured",
    );
  }
  assertCampaignSize(input.subscriptions.length);

  const db = getDb();
  if (input.subscriptions.length === 0) {
    await db.update(notificationCampaigns).set({
      status: "failed",
      acceptedCount: 0,
      failedCount: 0,
      completedAt: new Date(),
    }).where(eq(notificationCampaigns.id, input.campaignId));
    return { accepted: 0, failed: 0 };
  }

  const deliveryRows = await db.insert(notificationDeliveries).values(
    input.subscriptions.map((subscription) => ({
      campaignId: input.campaignId,
      subscriptionId: subscription.id,
      recipientClerkId: subscription.userClerkId,
    })),
  ).returning({
    id: notificationDeliveries.id,
    subscriptionId: notificationDeliveries.subscriptionId,
  });
  const deliveryIdBySubscription = new Map(
    deliveryRows.map((delivery) => [delivery.subscriptionId, delivery.id]),
  );

  webPush.setVapidDetails(
    configuration.contact,
    configuration.publicKey,
    configuration.privateKey,
  );
  const results = await mapWithConcurrency(
    input.subscriptions,
    deliveryConcurrency,
    async (subscription) => {
      const deliveryId = deliveryIdBySubscription.get(subscription.id);
      if (!deliveryId) {
        return { accepted: false, stale: false, providerStatus: null, errorCode: "delivery_record_missing" };
      }
      try {
        const payload = JSON.stringify({
          version: 1,
          campaignId: input.campaignId,
          deliveryId,
          title: input.title,
          body: input.body,
          destination: input.destination,
        });
        const result = await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
          {
            TTL: 60 * 60,
            urgency: "normal",
            topic: input.campaignId.replaceAll("-", "").slice(0, 32),
          },
        );
        await db.update(notificationDeliveries).set({
          status: "accepted",
          providerStatus: result.statusCode,
          errorCode: null,
          sentAt: new Date(),
        }).where(eq(notificationDeliveries.id, deliveryId));
        return { accepted: true, stale: false, providerStatus: result.statusCode, errorCode: null };
      } catch (error) {
        const failure = classifyWebPushFailure(error);
        await db.update(notificationDeliveries).set({
          status: "failed",
          providerStatus: failure.providerStatus,
          errorCode: failure.errorCode,
          sentAt: new Date(),
        }).where(eq(notificationDeliveries.id, deliveryId));
        await db.update(webPushSubscriptions).set({
          failureCount: sql`${webPushSubscriptions.failureCount} + 1`,
          ...(failure.stale && input.cleanupStaleSubscriptions !== false
            ? { isActive: false, revokedAt: new Date() }
            : {}),
          updatedAt: new Date(),
        }).where(eq(webPushSubscriptions.id, subscription.id));
        return { accepted: false, ...failure };
      }
    },
  );

  const accepted = results.filter((result) => result.accepted).length;
  const failed = results.length - accepted;
  const status = accepted === results.length
    ? "completed"
    : accepted > 0
      ? "partial"
      : "failed";
  await db.update(notificationCampaigns).set({
    status,
    acceptedCount: accepted,
    failedCount: failed,
    completedAt: new Date(),
  }).where(eq(notificationCampaigns.id, input.campaignId));
  return { accepted, failed };
}

export function classifyWebPushFailure(error: unknown) {
  const providerStatus = error instanceof WebPushError
    ? error.statusCode
    : typeof error === "object" && error !== null && "statusCode" in error &&
        typeof error.statusCode === "number"
      ? error.statusCode
      : null;
  const stale = providerStatus === 404 || providerStatus === 410;
  return {
    stale,
    providerStatus,
    errorCode: stale
      ? "subscription_expired"
      : providerStatus
        ? `provider_${providerStatus}`
        : "provider_unavailable",
  };
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]!);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  );
  return results;
}

export class NotificationDeliveryError extends Error {
  constructor(
    public readonly code: "audience_too_large" | "push_not_configured",
    message: string,
  ) {
    super(message);
  }
}
