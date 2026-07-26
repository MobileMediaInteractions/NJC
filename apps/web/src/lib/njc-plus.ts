import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  premiumAuditLogs,
  premiumContent,
  premiumEntitlements,
  premiumHomepageModules,
  premiumPlaybackProgress,
  premiumSubscriptions,
  premiumTiers,
} from "@harborline/backend/schema";
import { getOptionalAccountId, getStudioUser } from "@/lib/auth";
import {
  isNjcPlusFeatureEnabled,
  isNjcPlusPublicEnabled,
  type NjcPlusChildFlag,
} from "@/lib/feature-flags";
import { getActiveBetaTesterGrant } from "@/lib/njc-plus-beta";
import {
  betaTesterCanAccessContent,
  betaTesterHasFeature,
  classifyNjcPlusEntitlement,
  type NjcPlusEntitlementType,
} from "@/lib/njc-plus-beta-contract";
import {
  premiumKindFormat,
  type PremiumContentRecord,
} from "@/lib/njc-plus-contract";
export {
  premiumContentInput,
  premiumContentKinds,
  premiumContentStatuses,
  premiumKindFormat,
  premiumKindLabel,
  premiumPaywallPolicies,
  type PremiumContentInput,
  type PremiumContentRecord,
} from "@/lib/njc-plus-contract";

export function requiredFeatureForContent(kind: string): NjcPlusChildFlag | null {
  if (kind === "live" || kind === "breaking") return "njc_plus_live";
  if (kind === "podcast" || kind === "podcast_episode") return "njc_plus_podcasts";
  if (kind === "audio") return "njc_plus_audio";
  if (premiumKindFormat(kind) === "video") return "njc_plus_video";
  return null;
}

export async function filterPremiumContentByFlags<T extends { kind: string }>(
  items: T[],
  options?: { betaFeatureKeys?: readonly string[] },
) {
  const required = new Set(items.map((item) => requiredFeatureForContent(item.kind)).filter(Boolean));
  const states = new Map<NjcPlusChildFlag, boolean>();
  await Promise.all([...required].map(async (flag) => {
    if (flag) states.set(flag, await isNjcPlusFeatureEnabled(flag));
  }));
  return items.filter((item) => {
    const flag = requiredFeatureForContent(item.kind);
    return !flag || states.get(flag) === true || options?.betaFeatureKeys?.includes(flag) === true;
  });
}

export async function canUseStudioPreview(value?: string) {
  if (value !== "studio") return false;
  return Boolean(await getStudioUser());
}

export async function resolveNjcPlusSurface(options?: {
  preview?: string;
  feature?: NjcPlusChildFlag;
}) {
  const studioPreview = await canUseStudioPreview(options?.preview);
  if (studioPreview) {
    return { available: true, studioPreview: true, invitedBetaTester: false, betaFeatureKeys: [] as string[] };
  }
  const [parent, featureEnabled, betaGrant] = await Promise.all([
    isNjcPlusPublicEnabled(),
    options?.feature ? isNjcPlusFeatureEnabled(options.feature) : Promise.resolve(true),
    getActiveBetaTesterGrant(),
  ]);
  const publicAvailable = parent && featureEnabled;
  const betaAvailable = Boolean(
    betaGrant && (!options?.feature || betaTesterHasFeature(betaGrant, options.feature)),
  );
  return {
    available: publicAvailable || betaAvailable,
    studioPreview: false,
    invitedBetaTester: betaAvailable,
    betaFeatureKeys: betaGrant?.featureKeys ?? [],
  };
}

export const getPublishedPremiumContent = cache(async function getPublishedPremiumContent(options?: {
  kind?: string;
  limit?: number;
  includeUnpublished?: boolean;
}) {
  if (!hasDatabase()) return [];
  const conditions = options?.includeUnpublished
    ? [or(isNull(premiumContent.archivedAt), eq(premiumContent.status, "archived"))!]
    : [eq(premiumContent.status, "published"), isNull(premiumContent.archivedAt)];
  if (options?.kind) conditions.push(eq(premiumContent.kind, options.kind));
  return getDb()
    .select()
    .from(premiumContent)
    .where(and(...conditions))
    .orderBy(desc(premiumContent.isBreaking), desc(premiumContent.isFeatured), desc(premiumContent.publishedAt), desc(premiumContent.updatedAt))
    .limit(Math.min(options?.limit ?? 100, 250));
});

export async function getPremiumContentBySlug(slug: string, includeUnpublished = false) {
  if (!hasDatabase()) return null;
  const conditions = [eq(premiumContent.slug, slug)];
  if (!includeUnpublished) conditions.push(eq(premiumContent.status, "published"), isNull(premiumContent.archivedAt));
  const [record] = await getDb().select().from(premiumContent).where(and(...conditions)).limit(1);
  return record ?? null;
}

export async function getPremiumContentConnections(
  content: Pick<PremiumContentRecord, "id" | "parentId" | "relatedIds">,
  includeUnpublished = false,
  betaFeatureKeys: readonly string[] = [],
) {
  if (!hasDatabase()) return { related: [], previous: null, next: null };
  const publication = includeUnpublished
    ? undefined
    : and(eq(premiumContent.status, "published"), isNull(premiumContent.archivedAt));
  const [relatedRows, siblings] = await Promise.all([
    content.relatedIds.length
      ? getDb().select().from(premiumContent).where(and(
          inArray(premiumContent.id, content.relatedIds),
          publication,
        ))
      : Promise.resolve([]),
    content.parentId
      ? getDb().select().from(premiumContent).where(and(
          eq(premiumContent.parentId, content.parentId),
          publication,
        )).orderBy(asc(premiumContent.seasonNumber), asc(premiumContent.episodeNumber), asc(premiumContent.createdAt))
      : Promise.resolve([]),
  ]);
  const related = includeUnpublished ? relatedRows : await filterPremiumContentByFlags(relatedRows, { betaFeatureKeys });
  const availableSiblings = includeUnpublished ? siblings : await filterPremiumContentByFlags(siblings, { betaFeatureKeys });
  const index = availableSiblings.findIndex((item) => item.id === content.id);
  return {
    related,
    previous: index > 0 ? availableSiblings[index - 1] ?? null : null,
    next: index >= 0 ? availableSiblings[index + 1] ?? null : null,
  };
}

export const getPremiumHomepage = cache(async function getPremiumHomepage(includeDisabled = false) {
  if (!hasDatabase()) return [];
  const now = new Date();
  const conditions = [
    or(isNull(premiumHomepageModules.startsAt), lte(premiumHomepageModules.startsAt, now))!,
    or(isNull(premiumHomepageModules.endsAt), gt(premiumHomepageModules.endsAt, now))!,
  ];
  if (!includeDisabled) conditions.push(eq(premiumHomepageModules.enabled, true));
  return getDb().select().from(premiumHomepageModules).where(and(...conditions)).orderBy(premiumHomepageModules.sortOrder);
});

export type PremiumAccessDecision = {
  signedIn: boolean;
  member: boolean;
  memberBranding: boolean;
  entitlementType: NjcPlusEntitlementType;
  trial: boolean;
  complimentary: boolean;
  invitedBetaTester: boolean;
  allowed: boolean;
  reason: "free" | "registration_required" | "member" | "trial" | "complimentary" | "invited_beta_tester" | "tier_required" | "locked";
  tierIds: string[];
  expiresAt: Date | null;
};

export async function resolvePremiumAccess(
  content?: Pick<PremiumContentRecord, "id" | "paywallPolicy" | "requiredTierIds"> | null,
  suppliedUserId?: string | null,
): Promise<PremiumAccessDecision> {
  const userId = suppliedUserId === undefined ? await getOptionalAccountId() : suppliedUserId;
  if (content?.paywallPolicy === "free") {
    return { signedIn: Boolean(userId), member: false, memberBranding: false, entitlementType: "none", trial: false, complimentary: false, invitedBetaTester: false, allowed: true, reason: "free", tierIds: [], expiresAt: null };
  }
  if (!userId) {
    return {
      signedIn: false,
      member: false,
      memberBranding: false,
      entitlementType: "none",
      trial: false,
      complimentary: false,
      invitedBetaTester: false,
      allowed: false,
      reason: content?.paywallPolicy === "registration" ? "registration_required" : "locked",
      tierIds: [],
      expiresAt: null,
    };
  }
  if (content?.paywallPolicy === "registration") {
    return { signedIn: true, member: false, memberBranding: false, entitlementType: "none", trial: false, complimentary: false, invitedBetaTester: false, allowed: true, reason: "member", tierIds: [], expiresAt: null };
  }
  if (!hasDatabase()) {
    return { signedIn: true, member: false, memberBranding: false, entitlementType: "none", trial: false, complimentary: false, invitedBetaTester: false, allowed: false, reason: "locked", tierIds: [], expiresAt: null };
  }

  const now = new Date();
  const [entitlements, subscriptions, betaGrant] = await Promise.all([
    getDb().select().from(premiumEntitlements).where(and(
      eq(premiumEntitlements.userClerkId, userId),
      eq(premiumEntitlements.status, "active"),
      lte(premiumEntitlements.startsAt, now),
      or(isNull(premiumEntitlements.endsAt), gt(premiumEntitlements.endsAt, now)),
    )),
    getDb().select({ tierId: premiumSubscriptions.tierId, status: premiumSubscriptions.status, endsAt: premiumSubscriptions.currentPeriodEndsAt })
      .from(premiumSubscriptions)
      .where(and(
        eq(premiumSubscriptions.userClerkId, userId),
        inArray(premiumSubscriptions.status, ["trialing", "active"]),
        or(isNull(premiumSubscriptions.currentPeriodEndsAt), gt(premiumSubscriptions.currentPeriodEndsAt, now)),
      )),
    getActiveBetaTesterGrant(userId),
  ]);

  const tierIds = new Set(subscriptions.map((item) => item.tierId));
  for (const entitlement of entitlements) {
    if (entitlement.scopeType === "tier") tierIds.add(entitlement.scopeId);
  }
  const contentGrant = content
    ? entitlements.some((item) => item.scopeType === "content" && item.scopeId === content.id)
    : false;
  const productGrant = entitlements.some((item) => item.scopeType === "product" && item.scopeId === "njc_plus");
  const paidMember = subscriptions.some((item) => item.status === "active");
  const trial = subscriptions.some((item) => item.status === "trialing") ||
    entitlements.some((item) => item.sourceType === "trial");
  const complimentary = entitlements.some((item) =>
    ["manual", "promotion", "complimentary"].includes(item.sourceType) &&
    (item.scopeType === "product" || item.scopeType === "tier"),
  );
  const entitlementType = classifyNjcPlusEntitlement({
    paidMember,
    trial,
    complimentary,
    invitedBetaTester: Boolean(betaGrant),
  });
  const requiredTiers = content?.requiredTierIds ?? [];
  const tierAllowed = requiredTiers.length === 0 || requiredTiers.some((tierId) => tierIds.has(tierId));
  const standardPremiumAccess = productGrant || tierIds.size > 0;
  const betaAllowed = betaTesterCanAccessContent(betaGrant, content?.id, content?.paywallPolicy, now);
  const allowed = betaAllowed || contentGrant || (
    content?.paywallPolicy === "specific_tier"
      ? requiredTiers.length > 0 && tierAllowed
      : content?.paywallPolicy === "njc_plus" || !content
        ? standardPremiumAccess && tierAllowed
        : false
  );
  const expirations = [
    ...subscriptions.map((item) => item.endsAt),
    ...entitlements.map((item) => item.endsAt),
    betaGrant?.endsAt ?? null,
  ].filter((value): value is Date => Boolean(value));
  const expiresAt = expirations.length
    ? expirations.reduce((latest, value) => (value > latest ? value : latest))
    : null;
  return {
    signedIn: true,
    member: paidMember,
    memberBranding: paidMember || complimentary || Boolean(betaGrant?.showMemberBranding),
    entitlementType,
    trial,
    complimentary,
    invitedBetaTester: Boolean(betaGrant),
    allowed,
    reason: allowed
      ? betaAllowed && entitlementType === "invited_beta_tester"
        ? "invited_beta_tester"
        : entitlementType === "njc_plus_trial"
          ? "trial"
          : entitlementType === "complimentary_njc_plus"
            ? "complimentary"
            : requiredTiers.length
              ? "tier_required"
              : "member"
      : requiredTiers.length ? "tier_required" : "locked",
    tierIds: [...tierIds],
    expiresAt,
  };
}

export async function getVisiblePremiumTiers(includeHidden = false) {
  if (!hasDatabase()) return [];
  const conditions = includeHidden
    ? undefined
    : and(eq(premiumTiers.available, true), eq(premiumTiers.visible, true));
  return getDb().select().from(premiumTiers).where(conditions).orderBy(premiumTiers.priceCents);
}

export async function getPremiumPlaybackProgress(contentId: string) {
  const userId = await getOptionalAccountId();
  if (!userId || !hasDatabase()) return null;
  const [progress] = await getDb().select().from(premiumPlaybackProgress).where(and(
    eq(premiumPlaybackProgress.userClerkId, userId),
    eq(premiumPlaybackProgress.contentId, contentId),
  )).limit(1);
  return progress ?? null;
}

export async function writePremiumAudit(input: {
  request?: Request;
  actorClerkId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!hasDatabase()) return;
  const forwarded = input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = forwarded
    ? createHash("sha256").update(`${process.env.API_KEY_PEPPER ?? "njc-plus"}:${forwarded}`).digest("hex")
    : null;
  await getDb().insert(premiumAuditLogs).values({
    actorClerkId: input.actorClerkId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    metadata: input.metadata ?? {},
    ipHash,
  });
}

export function sumAccessCredits(rows: Array<{ amount: number }>) {
  return rows.reduce((total, row) => total + row.amount, 0);
}
