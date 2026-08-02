import { studioModuleKeys, type SiteConfiguration } from "@/lib/site-settings";

export const platformKeys = ["web", "ios", "android", "employee-ios", "employee-android", "apple-tv", "android-tv", "roku", "njc-plus", "studio", "cdn", "developer-api", "studio-nj-dev", "feature-platform"] as const;
export type PlatformKey = (typeof platformKeys)[number];
export type RegistryClassification = "toggleable" | "configuration-only" | "environment-managed" | "release-gated" | "planned" | "deprecated" | "mandatory-safety-control";

export type FeatureRegistryEntry = {
  key: string;
  name: string;
  description: string;
  owner: string;
  category: string;
  platforms: PlatformKey[];
  classification: RegistryClassification;
  availability: "available" | "partial" | "planned" | "environment-required";
  defaultState: "enabled" | "disabled" | "required";
  dependencies: string[];
  conflicts: string[];
  permission: string;
  rollout: "runtime" | "release" | "migration" | "external";
  operationalReadiness: string;
  configurationPath?: string;
};

const featureNames: Record<keyof SiteConfiguration["features"], [string, string]> = {
  comments: ["Reader comments", "Public discussion and moderation surfaces."],
  newsletters: ["Newsletters", "Reader newsletter enrollment and delivery."],
  alerts: ["Breaking-news alerts", "Reader alert enrollment and delivery."],
  liveVideo: ["Live video", "Live broadcast discovery and playback."],
  weather: ["Weather", "Current conditions and forecasts."],
  membership: ["Membership", "Reader membership entry points."],
  donations: ["Donations", "Reader-support contribution entry points."],
  pseudonyms: ["Pseudonymous bylines", "Verified pseudonymous author identities with internal accountability."],
  distribution: ["Secure distribution", "Permissioned pre-publication package delivery."],
};

const moduleNames: Record<(typeof studioModuleKeys)[number], string> = {
  commandReference: "Commands and shortcuts", stories: "Editorial stories", media: "Media library", tips: "News tips", twentyUnderTwenty: "20 Under 20", distributionManager: "Distribution manager", pressReleases: "Press releases", pressRequests: "Press-kit requests", exports: "Portable exports", chat: "Team chat", team: "Team and roles", notifications: "Reader notifications", njcPlusOverview: "NJC+ overview", njcPlusContent: "NJC+ content", njcPlusHomepage: "NJC+ homepage", njcPlusCommerce: "NJC+ commerce", njcPlusAccess: "NJC+ access", njcPlusCredits: "NJC+ credits", njcPlusComments: "NJC+ comments", njcPlusAnalytics: "NJC+ analytics", njcPlusAudit: "NJC+ audit", njcPlusFlags: "NJC+ flags", financeOverview: "Finance overview", financeLedger: "Finance ledger", financeReconciliation: "Finance reconciliation", financeSettings: "Finance policy", analytics: "Audience analytics", legal: "Legal publishing",
};

const runtimeFeatures: FeatureRegistryEntry[] = Object.entries(featureNames).map(([key, [name, description]]) => ({
  key: `reader.${key}`,
  name,
  description,
  owner: key === "pseudonyms" ? "Editorial standards" : "Audience product",
  category: "Reader features",
  platforms: ["web", "ios", "android", "apple-tv", "android-tv", "roku", "developer-api", "studio"],
  classification: "toggleable",
  availability: key === "donations" ? "planned" : "available",
  defaultState: "enabled",
  dependencies: key === "pseudonyms" ? ["safety.authorization", "safety.audit"] : [],
  conflicts: [],
  permission: "site_settings.manage",
  rollout: "runtime",
  operationalReadiness: key === "pseudonyms" ? "Moderation and publication validation connected" : "Runtime flag distributed",
  configurationPath: `features.${key}`,
}));

const studioModules: FeatureRegistryEntry[] = studioModuleKeys.map((key) => ({
  key: `studio.module.${key}`,
  name: moduleNames[key],
  description: `Studio workspace for ${moduleNames[key].toLowerCase()}.`,
  owner: "Newsroom operations",
  category: "Studio modules",
  platforms: ["studio"],
  classification: "toggleable",
  availability: "available",
  defaultState: "enabled",
  dependencies: ["safety.authentication", "safety.authorization", "safety.audit"],
  conflicts: [],
  permission: "site_settings.manage",
  rollout: "runtime",
  operationalReadiness: "Permission-aware route and navigation guard",
  configurationPath: `studio.modules.${key}`,
}));

export const platformFeatureRegistry: FeatureRegistryEntry[] = [
  ...runtimeFeatures,
  ...studioModules,
  { key: "studio.editorial.rich-composer", name: "Visual story composer", description: "Versioned rich article editing with write, split and live reader-preview modes while retaining portable plain-copy fallbacks.", owner: "Editorial product", category: "Editorial workflow", platforms: ["studio", "web"], classification: "toggleable", availability: "available", defaultState: "enabled", dependencies: ["safety.authorization", "safety.audit"], conflicts: [], permission: "story.edit", rollout: "runtime", operationalReadiness: "Rich document validation, revision snapshots and safe public rendering connected", configurationPath: "studio.experience.richStoryEditor" },
  { key: "studio.editorial.ai-image-placeholders", name: "AI image placeholders", description: "Creates temporary, provenance-tracked editorial illustrations from story copy; placeholders must be replaced before approval or publication.", owner: "Editorial product", category: "Editorial workflow", platforms: ["studio", "web"], classification: "toggleable", availability: "environment-required", defaultState: "disabled", dependencies: ["safety.authorization", "safety.audit", "platform.cdn"], conflicts: [], permission: "story.edit", rollout: "runtime", operationalReadiness: "Requires Cloudflare Workers AI and Vercel Blob credentials", configurationPath: "studio.experience.aiImagePlaceholders" },
  { key: "editorial.approval-gated-scheduling", name: "Approval-gated scheduling", description: "Hash-bound approval and durable scheduled publication queue.", owner: "Editorial operations", category: "Editorial workflow", platforms: ["studio", "web", "ios", "android", "apple-tv", "android-tv", "roku", "developer-api"], classification: "toggleable", availability: "available", defaultState: "enabled", dependencies: ["safety.authorization", "safety.audit", "operations.scheduler"], conflicts: [], permission: "story.publish", rollout: "runtime", operationalReadiness: "Worker and queue enabled", configurationPath: "studio.automations.scheduledPublishing" },
  { key: "operations.scheduler", name: "Publication worker", description: "GitHub Actions and Vercel daily fallback execute the idempotent queue worker.", owner: "Platform operations", category: "Integrations", platforms: ["web", "studio"], classification: "environment-managed", availability: "environment-required", defaultState: "required", dependencies: ["safety.authorization", "safety.audit"], conflicts: [], permission: "deployment.manage", rollout: "external", operationalReadiness: "Requires CRON_SECRET in GitHub and Vercel" },
  { key: "integration.clerk", name: "Clerk identity", description: "Authentication and account identity provider.", owner: "Security", category: "Integrations", platforms: ["web", "ios", "android", "employee-ios", "employee-android", "apple-tv", "android-tv", "roku", "studio"], classification: "environment-managed", availability: "environment-required", defaultState: "required", dependencies: [], conflicts: [], permission: "deployment.manage", rollout: "external", operationalReadiness: "Environment health only; secrets never enter configuration" },
  { key: "integration.postgres", name: "Postgres", description: "Authoritative relational data store and transactional workflow boundary.", owner: "Platform operations", category: "Integrations", platforms: [...platformKeys], classification: "environment-managed", availability: "environment-required", defaultState: "required", dependencies: [], conflicts: [], permission: "deployment.manage", rollout: "migration", operationalReadiness: "Migration required" },
  { key: "release.beta-entitlements", name: "Invite-only beta entitlement", description: "Separates invited testers from paid membership, trials, and complimentary access.", owner: "Product", category: "Release channels", platforms: ["web", "ios", "android", "apple-tv", "android-tv", "roku", "njc-plus"], classification: "release-gated", availability: "available", defaultState: "disabled", dependencies: ["safety.authorization", "safety.audit"], conflicts: [], permission: "njc_plus.access.manage", rollout: "runtime", operationalReadiness: "Per-account entitlements available" },
  { key: "platform.studio-nj-dev", name: "Studio NJ Dev", description: "Desktop visual feature and animation studio.", owner: "Creative engineering", category: "Applications", platforms: ["studio-nj-dev", "feature-platform"], classification: "release-gated", availability: "partial", defaultState: "disabled", dependencies: [], conflicts: [], permission: "platform.license", rollout: "release", operationalReadiness: "Desktop release and license required" },
  { key: "platform.cdn", name: "Courier CDN", description: "Versioned editorial and brand asset delivery.", owner: "Platform operations", category: "Applications", platforms: ["cdn", "web", "ios", "android", "apple-tv", "android-tv", "roku"], classification: "configuration-only", availability: "available", defaultState: "enabled", dependencies: [], conflicts: [], permission: "deployment.manage", rollout: "release", operationalReadiness: "Build-time asset synchronization" },
  ...["authentication", "authorization", "audit", "encryption", "portable-backups"].map((name): FeatureRegistryEntry => ({ key: `safety.${name}`, name: name.replace(/\b\w/g, (value) => value.toUpperCase()), description: `Mandatory ${name} protection. This control is visible for accountability and cannot be disabled in Studio.`, owner: "Security", category: "Mandatory safety", platforms: [...platformKeys], classification: "mandatory-safety-control", availability: "available", defaultState: "required", dependencies: [], conflicts: [], permission: "immutable", rollout: name === "portable-backups" ? "migration" : "release", operationalReadiness: "Mandatory and fail-closed" })),
];

export function registryValue(configuration: SiteConfiguration, path?: string) {
  if (!path) return null;
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, configuration);
}

export function configurationImpact(before: SiteConfiguration, after: SiteConfiguration) {
  return platformFeatureRegistry.filter((entry) => entry.configurationPath && registryValue(before, entry.configurationPath) !== registryValue(after, entry.configurationPath));
}
