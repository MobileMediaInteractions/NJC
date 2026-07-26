export const njcPlusBetaDisclosure =
  "Most NJC+ beta features are included for active NJC+ members. A limited number of invited testers may also receive temporary access to selected beta features.";

export type NjcPlusEntitlementType =
  | "njc_plus_member"
  | "njc_plus_trial"
  | "complimentary_njc_plus"
  | "invited_beta_tester"
  | "none";

export type BetaTesterGrantLike = {
  status: string;
  featureKeys: string[];
  premiumContentIncluded: boolean;
  contentIds: string[];
  showMemberBranding: boolean;
  startsAt: Date;
  endsAt: Date;
};

export function isBetaTesterGrantActive(
  grant: Pick<BetaTesterGrantLike, "status" | "startsAt" | "endsAt">,
  now = new Date(),
) {
  return grant.status === "active" && grant.startsAt <= now && grant.endsAt > now;
}

export function betaTesterHasFeature(
  grant: BetaTesterGrantLike | null | undefined,
  featureKey: string,
  now = new Date(),
) {
  return Boolean(grant && isBetaTesterGrantActive(grant, now) && grant.featureKeys.includes(featureKey));
}

export function betaTesterCanAccessContent(
  grant: BetaTesterGrantLike | null | undefined,
  contentId: string | undefined,
  paywallPolicy: string | undefined,
  now = new Date(),
) {
  if (!grant || !isBetaTesterGrantActive(grant, now)) return false;
  if (contentId && grant.contentIds.includes(contentId)) return true;
  return grant.premiumContentIncluded && ["njc_plus", "specific_tier"].includes(paywallPolicy ?? "njc_plus");
}

export function classifyNjcPlusEntitlement(input: {
  paidMember: boolean;
  trial: boolean;
  complimentary: boolean;
  invitedBetaTester: boolean;
}): NjcPlusEntitlementType {
  if (input.paidMember) return "njc_plus_member";
  if (input.trial) return "njc_plus_trial";
  if (input.complimentary) return "complimentary_njc_plus";
  if (input.invitedBetaTester) return "invited_beta_tester";
  return "none";
}

export function njcPlusEntitlementLabel(type: NjcPlusEntitlementType) {
  if (type === "njc_plus_member") return "NJC+ Member";
  if (type === "njc_plus_trial") return "NJC+ Trial";
  if (type === "complimentary_njc_plus") return "Complimentary NJC+";
  if (type === "invited_beta_tester") return "Invited Beta Tester";
  return null;
}
