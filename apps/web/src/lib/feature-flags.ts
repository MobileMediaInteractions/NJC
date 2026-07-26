import { inArray } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { featureFlags } from "@harborline/backend/schema";

export const njcPlusParentFlag = "njc_plus_beta" as const;

export const njcPlusChildFlags = [
  "njc_plus_video",
  "njc_plus_audio",
  "njc_plus_podcasts",
  "njc_plus_live",
  "njc_plus_paywalls",
  "njc_plus_trials",
  "njc_plus_access_credits",
  "njc_plus_search",
  "njc_plus_checkout",
  "njc_plus_comments",
  "njc_plus_membership_branding",
] as const;

export type NjcPlusChildFlag = (typeof njcPlusChildFlags)[number];
export type NjcPlusFlag = typeof njcPlusParentFlag | NjcPlusChildFlag;

export const njcPlusInvitedBetaFeatures = [
  "njc_plus_video",
  "njc_plus_audio",
  "njc_plus_podcasts",
  "njc_plus_live",
  "njc_plus_search",
  "njc_plus_comments",
] as const satisfies readonly NjcPlusChildFlag[];

export type NjcPlusInvitedBetaFeature = (typeof njcPlusInvitedBetaFeatures)[number];

export type FeatureFlagState = {
  key: NjcPlusFlag;
  enabled: boolean;
  effective: boolean;
  description: string;
  configuration: Record<string, unknown>;
  updatedAt: Date | null;
};

const descriptions: Record<NjcPlusFlag, string> = {
  njc_plus_beta: "Master release control for every NJC+ public surface.",
  njc_plus_video: "Video catalog, player and viewing progress.",
  njc_plus_audio: "Audio stories, player and listening progress.",
  njc_plus_podcasts: "Podcast series and episodes.",
  njc_plus_live: "Live video, audio and breaking coverage.",
  njc_plus_paywalls: "Backend entitlement policies and public lock states.",
  njc_plus_trials: "Trial promotion and eligibility.",
  njc_plus_access_credits: "Public Access Credit balances and redemption.",
  njc_plus_search: "NJC+ public search and discovery.",
  njc_plus_checkout: "Public checkout and subscription creation.",
  njc_plus_comments: "Public NJC+ discussion surfaces.",
  njc_plus_membership_branding: "Sitewide premium member treatment.",
};

export const allNjcPlusFlags = [
  njcPlusParentFlag,
  ...njcPlusChildFlags,
] as const;

const getStoredNjcPlusFlags = cache(async () => {
  if (!hasDatabase()) return [];
  try {
    return await getDb()
      .select()
      .from(featureFlags)
      .where(inArray(featureFlags.key, [...allNjcPlusFlags]));
  } catch (error) {
    console.error("NJC+ feature flag lookup failed", error);
    return [];
  }
});

export async function getNjcPlusFlags(): Promise<FeatureFlagState[]> {
  const rows = await getStoredNjcPlusFlags();
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const parentEnabled = byKey.get(njcPlusParentFlag)?.enabled === true;

  return allNjcPlusFlags.map((key) => {
    const row = byKey.get(key);
    const enabled = row?.enabled === true;
    return {
      key,
      enabled,
      effective: key === njcPlusParentFlag ? enabled : parentEnabled && enabled,
      description: row?.description || descriptions[key],
      configuration:
        row?.configuration && typeof row.configuration === "object"
          ? (row.configuration as Record<string, unknown>)
          : {},
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function getNjcPlusFlag(key: NjcPlusFlag) {
  return (await getNjcPlusFlags()).find((flag) => flag.key === key)!;
}

export async function isNjcPlusPublicEnabled() {
  return (await getNjcPlusFlag(njcPlusParentFlag)).effective;
}

export async function isNjcPlusFeatureEnabled(key: NjcPlusChildFlag) {
  return (await getNjcPlusFlag(key)).effective;
}

export function describeNjcPlusFlag(key: NjcPlusFlag) {
  return descriptions[key];
}
