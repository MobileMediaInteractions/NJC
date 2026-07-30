import "server-only";

import {
  and,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import {
  premiumBetaTesterGrants,
  premiumEntitlements,
  premiumSubscriptions,
  users,
  webPushSubscriptions,
} from "@harborline/backend/schema";
import {
  countNotificationRecipients,
  resolveExclusiveNjcPlusSegment,
  type NotificationAudience,
  uniqueNotificationIds,
} from "@/lib/site-notification-policy";

export type NotificationSubscriptionTarget = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userClerkId: string | null;
};

export async function resolveNotificationRecipientIds(
  audience: Exclude<NotificationAudience, { type: "sitewide" }>,
  now = new Date(),
) {
  const db = getDb();
  if (audience.type === "accounts") return audience.userClerkIds;

  if (audience.type === "staff_roles") {
    const rows = await db
      .select({ userClerkId: users.clerkId })
      .from(users)
      .where(and(eq(users.isActive, true), inArray(users.role, audience.roles)));
    return uniqueNotificationIds(rows.map((row) => row.userClerkId));
  }

  const [paidRows, trialSubscriptions, trialEntitlements, complimentaryEntitlements, betaRows] =
    await Promise.all([
      db
      .select({ userClerkId: premiumSubscriptions.userClerkId })
      .from(premiumSubscriptions)
      .where(and(
        eq(premiumSubscriptions.status, "active"),
        or(
          isNull(premiumSubscriptions.currentPeriodEndsAt),
          gt(premiumSubscriptions.currentPeriodEndsAt, now),
        ),
      )),
      db
        .select({ userClerkId: premiumSubscriptions.userClerkId })
        .from(premiumSubscriptions)
        .where(and(
          eq(premiumSubscriptions.status, "trialing"),
          or(
            isNull(premiumSubscriptions.currentPeriodEndsAt),
            gt(premiumSubscriptions.currentPeriodEndsAt, now),
          ),
        )),
      activeEntitlements(now, ["trial"]),
      activeEntitlements(now, [
      "manual",
      "promotion",
      "complimentary",
      ]),
      db
        .select({ userClerkId: premiumBetaTesterGrants.userClerkId })
        .from(premiumBetaTesterGrants)
        .where(and(
          eq(premiumBetaTesterGrants.status, "active"),
          lte(premiumBetaTesterGrants.startsAt, now),
          gt(premiumBetaTesterGrants.endsAt, now),
          isNull(premiumBetaTesterGrants.revokedAt),
        )),
    ]);

  return resolveExclusiveNjcPlusSegment(audience.segment, {
    member: paidRows.map((row) => row.userClerkId),
    trial: [
      ...trialSubscriptions.map((row) => row.userClerkId),
      ...trialEntitlements.map((row) => row.userClerkId),
    ],
    complimentary: complimentaryEntitlements.map((row) => row.userClerkId),
    invitedBetaTester: betaRows.map((row) => row.userClerkId),
  });
}

export async function resolveNotificationSubscriptions(
  audience: NotificationAudience,
  now = new Date(),
) {
  const db = getDb();
  const activeCondition = and(
    eq(webPushSubscriptions.isActive, true),
    isNull(webPushSubscriptions.revokedAt),
  );
  const userClerkIds = audience.type === "sitewide"
    ? null
    : await resolveNotificationRecipientIds(audience, now);
  if (userClerkIds && userClerkIds.length === 0) {
    return { subscriptions: [] as NotificationSubscriptionTarget[], recipientCount: 0 };
  }

  const subscriptions = await db
    .select({
      id: webPushSubscriptions.id,
      endpoint: webPushSubscriptions.endpoint,
      p256dh: webPushSubscriptions.p256dh,
      auth: webPushSubscriptions.auth,
      userClerkId: webPushSubscriptions.userClerkId,
    })
    .from(webPushSubscriptions)
    .where(userClerkIds
      ? and(activeCondition, inArray(webPushSubscriptions.userClerkId, userClerkIds))
      : activeCondition);

  return {
    subscriptions,
    recipientCount: countNotificationRecipients(subscriptions),
  };
}

function activeEntitlements(now: Date, sourceTypes: string[]) {
  return getDb()
    .select({ userClerkId: premiumEntitlements.userClerkId })
    .from(premiumEntitlements)
    .where(and(
      eq(premiumEntitlements.status, "active"),
      lte(premiumEntitlements.startsAt, now),
      or(isNull(premiumEntitlements.endsAt), gt(premiumEntitlements.endsAt, now)),
      inArray(premiumEntitlements.sourceType, sourceTypes),
      inArray(premiumEntitlements.scopeType, ["product", "tier"]),
    ));
}
