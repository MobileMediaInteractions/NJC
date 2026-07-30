import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  notificationCampaigns,
  webPushSubscriptions,
} from "@harborline/backend/schema";
import { getWebPushConfiguration } from "@/lib/site-notification-delivery";
import type { SiteConfiguration } from "@/lib/site-settings";

export type SiteNotificationReadiness = {
  database: boolean;
  vapid: boolean;
  readerEnrollment: boolean;
  studioDelivery: boolean;
  ready: boolean;
  activeSubscriptions: number;
  totalCampaigns: number;
  lastCampaignAt: string | null;
};

export type StudioNotificationCampaign = {
  id: string;
  title: string;
  body: string;
  destination: string;
  audienceType: string;
  audienceSpec: {
    userClerkIds?: string[];
    roles?: string[];
    segment?: string;
  };
  status: string;
  recipientCount: number;
  subscriptionCount: number;
  acceptedCount: number;
  failedCount: number;
  openedCount: number;
  createdAt: string;
  completedAt: string | null;
};

export async function getSiteNotificationReadiness(
  configuration: SiteConfiguration,
): Promise<SiteNotificationReadiness> {
  const database = hasDatabase();
  const vapid = Boolean(getWebPushConfiguration());
  const readerEnrollment = configuration.features.alerts;
  const studioDelivery = configuration.studio.notifications.deliveryEnabled;
  const base = {
    database,
    vapid,
    readerEnrollment,
    studioDelivery,
    ready: database && vapid && readerEnrollment && studioDelivery,
  };

  if (!database) {
    return {
      ...base,
      activeSubscriptions: 0,
      totalCampaigns: 0,
      lastCampaignAt: null,
    };
  }

  try {
    const [[subscriptions], [campaigns], [lastCampaign]] = await Promise.all([
      getDb()
        .select({ value: count() })
        .from(webPushSubscriptions)
        .where(and(
          eq(webPushSubscriptions.isActive, true),
          isNull(webPushSubscriptions.revokedAt),
        )),
      getDb().select({ value: count() }).from(notificationCampaigns),
      getDb()
        .select({ createdAt: notificationCampaigns.createdAt })
        .from(notificationCampaigns)
        .orderBy(desc(notificationCampaigns.createdAt))
        .limit(1),
    ]);
    return {
      ...base,
      activeSubscriptions: Number(subscriptions?.value ?? 0),
      totalCampaigns: Number(campaigns?.value ?? 0),
      lastCampaignAt: lastCampaign?.createdAt.toISOString() ?? null,
    };
  } catch (error) {
    console.error("Notification readiness lookup failed", error);
    return {
      ...base,
      ready: false,
      activeSubscriptions: 0,
      totalCampaigns: 0,
      lastCampaignAt: null,
    };
  }
}

export async function getRecentNotificationCampaigns(
  limit = 50,
): Promise<StudioNotificationCampaign[]> {
  if (!hasDatabase()) return [];
  const rows = await getDb()
    .select()
    .from(notificationCampaigns)
    .orderBy(desc(notificationCampaigns.createdAt))
    .limit(limit);
  return rows.map((campaign) => ({
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    completedAt: campaign.completedAt?.toISOString() ?? null,
  }));
}
