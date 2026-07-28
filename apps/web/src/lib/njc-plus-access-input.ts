import { z } from "zod";
import { njcPlusInvitedBetaFeatures } from "@/lib/feature-flags";

const grantInput = z.object({
  action: z.literal("grant_access"),
  userClerkId: z.string().trim().min(3).max(200),
  scopeType: z.enum(["product", "tier", "content"]),
  scopeId: z.string().trim().min(1).max(200),
  sourceType: z.enum(["manual", "trial", "promotion", "complimentary"]),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  reason: z.string().trim().min(8).max(500),
});

const creditInput = z.object({
  action: z.literal("credit_transaction"),
  userClerkId: z.string().trim().min(3).max(200),
  amount: z.number().int().min(-10_000_000).max(10_000_000).refine((value) => value !== 0),
  transactionType: z.enum(["grant", "deduction", "expiration", "refund", "correction", "reversal"]),
  reason: z.string().trim().min(8).max(500),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

const entitlementAction = z.object({
  action: z.enum(["revoke_access", "pause_access", "resume_access"]),
  entitlementId: z.uuid(),
  reason: z.string().trim().min(8).max(500),
});

const adjustEntitlement = z.object({
  action: z.literal("adjust_access"),
  entitlementId: z.uuid(),
  endsAt: z.iso.datetime().nullable(),
  reason: z.string().trim().min(8).max(500),
});

const betaGrantFields = {
  featureKeys: z.array(z.enum(njcPlusInvitedBetaFeatures)).min(1).max(njcPlusInvitedBetaFeatures.length),
  premiumContentIncluded: z.boolean(),
  contentIds: z.array(z.uuid()).max(100).default([]),
  showMemberBranding: z.boolean(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  reason: z.string().trim().min(8).max(500),
};

const grantBetaTester = z.object({
  action: z.literal("grant_invited_beta"),
  userClerkId: z.string().trim().min(3).max(200),
  ...betaGrantFields,
});

const updateBetaTester = z.object({
  action: z.literal("update_invited_beta"),
  grantId: z.uuid(),
  ...betaGrantFields,
});

const betaTesterAction = z.object({
  action: z.enum(["pause_invited_beta", "resume_invited_beta", "revoke_invited_beta"]),
  grantId: z.uuid(),
  reason: z.string().trim().min(8).max(500),
});

export const njcPlusAccessActionInput = z.discriminatedUnion("action", [
  grantInput,
  creditInput,
  entitlementAction,
  adjustEntitlement,
  grantBetaTester,
  updateBetaTester,
  betaTesterAction,
]);

export type NjcPlusEntitlementActionInput = z.infer<typeof entitlementAction>;
