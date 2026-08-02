import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { siteConfigurationRevisions, siteSettings } from "@harborline/backend/schema";
import { siteConfig } from "@/lib/site";

export const siteConfigurationKey = "site_configuration_v1";
export const defaultDatelines = [
  "New Brunswick",
  "Middlesex County",
  "Trenton",
  "Edison",
  "Woodbridge",
] as const;

export const defaultEasterEggConfiguration = {
  enabled: true,
  title: "The Night Courier",
  message:
    "Some stories arrive after the presses stop. Somewhere between the Turnpike lights and the first morning train, this one found you.",
};

export const studioModuleKeys = [
  "commandReference",
  "stories",
  "media",
  "tips",
  "twentyUnderTwenty",
  "distributionManager",
  "pressReleases",
  "pressRequests",
  "exports",
  "chat",
  "team",
  "notifications",
  "njcPlusOverview",
  "njcPlusContent",
  "njcPlusHomepage",
  "njcPlusCommerce",
  "njcPlusAccess",
  "njcPlusCredits",
  "njcPlusComments",
  "njcPlusAnalytics",
  "njcPlusAudit",
  "njcPlusFlags",
  "financeOverview",
  "financeLedger",
  "financeReconciliation",
  "financeSettings",
  "analytics",
  "legal",
] as const;

export type StudioModuleKey = (typeof studioModuleKeys)[number];

export const defaultStudioModules: Record<StudioModuleKey, boolean> = {
  commandReference: true,
  stories: true,
  media: true,
  tips: true,
  twentyUnderTwenty: true,
  distributionManager: true,
  pressReleases: true,
  pressRequests: true,
  exports: true,
  chat: true,
  team: true,
  notifications: true,
  njcPlusOverview: true,
  njcPlusContent: true,
  njcPlusHomepage: true,
  njcPlusCommerce: true,
  njcPlusAccess: true,
  njcPlusCredits: true,
  njcPlusComments: true,
  njcPlusAnalytics: true,
  njcPlusAudit: true,
  njcPlusFlags: true,
  financeOverview: true,
  financeLedger: true,
  financeReconciliation: true,
  financeSettings: true,
  analytics: true,
  legal: true,
};

export const defaultStudioConfiguration = {
  modules: defaultStudioModules,
  experience: {
    commandPalette: true,
    contextualQuickActions: true,
    compactNavigation: true,
    showOperationalStatus: true,
    richStoryEditor: true,
    richStoryEditorDefaultMode: "split" as const,
  },
  notifications: {
    deliveryEnabled: true,
    allowSitewideAudience: true,
    allowAccountAudience: true,
    allowRoleAudience: true,
    allowNjcPlusAudience: true,
    requireAudiencePreflight: true,
    requireTypedConfirmationForBroadAudience: true,
    retainCampaignHistory: true,
  },
  editorialWorkflow: {
    activeStoryRevisions: true,
    requireIndependentRevisionApproval: true,
    requireFinalizationConfirmation: true,
    pseudonymEligibleRoles: Array.from(["admin", "editor", "producer", "reporter", "contributor"] as const),
    schedulingEligibleRoles: Array.from(["admin", "editor", "producer"] as const),
  },
  automations: {
    scheduledPublishing: true,
    analyticsArchives: true,
    accessCreditExpiration: true,
    stalePushSubscriptionCleanup: true,
    manualVerificationRequired: true,
  },
} as const;

const navigationItemSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: z.string().trim().regex(/^\/[A-Za-z0-9/_-]*$/, "Navigation links must be local paths beginning with /").max(160),
});

const adPlacementSchema = z.object({
  enabled: z.boolean(),
  slotId: z.string().trim().refine((value) => value === "" || /^\d{10}$/.test(value), "Ad unit IDs must contain 10 digits"),
});

const googleAnalyticsSchema = z.object({
  enabled: z.boolean(),
  measurementId: z.string().trim().refine(
    (value) => value === "" || /^G-[A-Z0-9]{6,20}$/.test(value),
    "Use a GA4 measurement ID such as G-AB12CD34EF",
  ),
}).superRefine((configuration, context) => {
  if (configuration.enabled && !configuration.measurementId) {
    context.addIssue({
      code: "custom",
      path: ["measurementId"],
      message: "A GA4 measurement ID is required before Google Analytics can be enabled",
    });
  }
});

export const siteConfigurationSchema = z.object({
  publication: z.object({
    name: z.string().trim().min(3).max(100),
    shortName: z.string().trim().min(2).max(40),
    tagline: z.string().trim().min(3).max(140),
    description: z.string().trim().min(20).max(320),
    region: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    station: z.string().trim().min(2).max(80),
    timezone: z.string().trim().min(3).max(80),
  }),
  navigation: z.array(navigationItemSchema).min(1).max(12),
  features: z.object({
    comments: z.boolean(),
    newsletters: z.boolean(),
    alerts: z.boolean(),
    liveVideo: z.boolean(),
    weather: z.boolean(),
    membership: z.boolean(),
    donations: z.boolean(),
    pseudonyms: z.boolean().default(true),
    distribution: z.boolean().default(true),
  }),
  editorial: z.object({
    datelines: z
      .array(z.string().trim().min(2).max(80))
      .min(1, "Add at least one newsroom dateline")
      .max(50)
      .refine(
        (values) =>
          new Set(values.map((value) => value.toLocaleLowerCase())).size ===
          values.length,
        "Datelines must be unique",
      ),
  }).default({ datelines: [...defaultDatelines] }),
  measurement: z.object({
    googleAnalytics: googleAnalyticsSchema,
  }).default({
    googleAnalytics: {
      enabled: false,
      measurementId: "",
    },
  }),
  advertising: z.object({
    enabled: z.boolean(),
    provider: z.literal("google-adsense"),
    publisherId: z.string().trim().refine(
      (value) => value === "" || /^(?:ca-)?pub-\d{16}$/.test(value),
      "Use an AdSense publisher ID such as pub-1234567890123456",
    ),
    autoAds: z.boolean(),
    previewMode: z.boolean(),
    privacyMessageConfigured: z.boolean(),
    adsTxtEnabled: z.boolean(),
    adBlockNoticeEnabled: z.boolean().default(true),
    adFreeNjcPlusEnabled: z.boolean().default(false),
    adFreePromoEnabled: z.boolean().default(false),
    adFreePromoText: z.string().trim().min(10).max(180).default("Support local journalism and enjoy The Courier without site ads with NJC+."),
    adFreePromoHref: z.string().trim().regex(/^\/[A-Za-z0-9/_-]*$/, "The NJC+ promotion must use a local path").max(160).default("/plus"),
    placements: z.object({
      homepageLeaderboard: adPlacementSchema,
      articleInline: adPlacementSchema,
      sectionInline: adPlacementSchema,
    }),
  }),
  easterEgg: z.object({
    enabled: z.boolean(),
    title: z.string().trim().min(3).max(80),
    message: z.string().trim().min(20).max(240),
  }).default(defaultEasterEggConfiguration),
  studio: z.object({
    modules: z.object({
      commandReference: z.boolean(),
      stories: z.boolean(),
      media: z.boolean(),
      tips: z.boolean(),
      twentyUnderTwenty: z.boolean(),
      distributionManager: z.boolean(),
      pressReleases: z.boolean(),
      pressRequests: z.boolean(),
      exports: z.boolean(),
      chat: z.boolean(),
      team: z.boolean(),
      notifications: z.boolean(),
      njcPlusOverview: z.boolean(),
      njcPlusContent: z.boolean(),
      njcPlusHomepage: z.boolean(),
      njcPlusCommerce: z.boolean(),
      njcPlusAccess: z.boolean(),
      njcPlusCredits: z.boolean(),
      njcPlusComments: z.boolean(),
      njcPlusAnalytics: z.boolean(),
      njcPlusAudit: z.boolean(),
      njcPlusFlags: z.boolean(),
      financeOverview: z.boolean(),
      financeLedger: z.boolean(),
      financeReconciliation: z.boolean(),
      financeSettings: z.boolean(),
      analytics: z.boolean(),
      legal: z.boolean(),
    }),
    experience: z.object({
      commandPalette: z.boolean(),
      contextualQuickActions: z.boolean(),
      compactNavigation: z.boolean(),
      showOperationalStatus: z.boolean(),
      richStoryEditor: z.boolean().default(true),
      richStoryEditorDefaultMode: z.enum(["write", "split", "preview"]).default("split"),
    }).default(defaultStudioConfiguration.experience),
    notifications: z.object({
      deliveryEnabled: z.boolean(),
      allowSitewideAudience: z.boolean(),
      allowAccountAudience: z.boolean(),
      allowRoleAudience: z.boolean(),
      allowNjcPlusAudience: z.boolean(),
      requireAudiencePreflight: z.literal(true),
      requireTypedConfirmationForBroadAudience: z.boolean(),
      retainCampaignHistory: z.boolean(),
    }),
    editorialWorkflow: z.object({
      activeStoryRevisions: z.boolean(),
      requireIndependentRevisionApproval: z.literal(true),
      requireFinalizationConfirmation: z.literal(true),
      pseudonymEligibleRoles: z.array(z.enum(["admin", "editor", "producer", "reporter", "contributor"])).min(1).default(["admin", "editor", "producer", "reporter", "contributor"]),
      schedulingEligibleRoles: z.array(z.enum(["admin", "editor", "producer"])).min(1).default(["admin", "editor", "producer"]),
    }).default(defaultStudioConfiguration.editorialWorkflow),
    automations: z.object({
      scheduledPublishing: z.boolean(),
      analyticsArchives: z.boolean(),
      accessCreditExpiration: z.boolean(),
      stalePushSubscriptionCleanup: z.boolean(),
      manualVerificationRequired: z.literal(true),
    }),
  }).default(defaultStudioConfiguration),
  registry: z.object({
    schemaVersion: z.literal(1),
    platformOverrides: z.record(
      z.string().regex(/^[a-z0-9-]+$/),
      z.record(z.string().regex(/^[a-z0-9.-]+$/), z.boolean()),
    ).default({}),
  }).default({ schemaVersion: 1, platformOverrides: {} }),
}).superRefine((configuration, context) => {
  const advertising = configuration.advertising;
  const liveDeliveryRequested = advertising.enabled && !advertising.previewMode;
  if (liveDeliveryRequested && !advertising.publisherId) {
    context.addIssue({ code: "custom", path: ["advertising", "publisherId"], message: "A publisher ID is required before advertising can be enabled" });
  }
  if (liveDeliveryRequested && !advertising.privacyMessageConfigured) {
    context.addIssue({ code: "custom", path: ["advertising", "privacyMessageConfigured"], message: "Confirm a Google-certified consent setup before enabling ads" });
  }
  for (const [name, placement] of Object.entries(advertising.placements)) {
    if (liveDeliveryRequested && placement.enabled && !placement.slotId) {
      context.addIssue({ code: "custom", path: ["advertising", "placements", name, "slotId"], message: "An enabled placement requires its AdSense ad unit ID" });
    }
  }
});

export type SiteConfiguration = z.infer<typeof siteConfigurationSchema>;
export type AdPlacementName = keyof SiteConfiguration["advertising"]["placements"];

export function include20Under20Navigation(
  navigation: SiteConfiguration["navigation"],
) {
  const initiative = { label: "20 Under 20", href: "/20-under-20" };
  const initiativeIndex = navigation.findIndex(
    (item) => item.href === initiative.href,
  );

  if (initiativeIndex >= 0) {
    return navigation.filter((item) => item.href !== "/staff");
  }

  const staffIndex = navigation.findIndex((item) => item.href === "/staff");
  if (staffIndex >= 0) {
    return navigation.map((item, index) =>
      index === staffIndex ? initiative : item,
    );
  }

  return navigation.length < 12 ? [...navigation, initiative] : navigation;
}

export const defaultSiteConfiguration: SiteConfiguration = {
  publication: {
    name: siteConfig.name,
    shortName: siteConfig.shortName,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    region: siteConfig.region,
    city: siteConfig.city,
    state: siteConfig.state,
    station: siteConfig.station,
    timezone: siteConfig.timezone,
  },
  navigation: siteConfig.navigation.map((item) => ({ ...item })),
  features: {
    comments: true,
    newsletters: true,
    alerts: true,
    liveVideo: true,
    weather: true,
    membership: siteConfig.monetization.membershipEnabled,
    donations: siteConfig.monetization.donationsEnabled,
    pseudonyms: true,
    distribution: true,
  },
  editorial: {
    datelines: [...defaultDatelines],
  },
  measurement: {
    googleAnalytics: {
      enabled: false,
      measurementId: "",
    },
  },
  advertising: {
    enabled: false,
    provider: "google-adsense",
    publisherId: "",
    autoAds: false,
    previewMode: true,
    privacyMessageConfigured: false,
    adsTxtEnabled: false,
    adBlockNoticeEnabled: true,
    adFreeNjcPlusEnabled: false,
    adFreePromoEnabled: false,
    adFreePromoText: "Support local journalism and enjoy The Courier without site ads with NJC+.",
    adFreePromoHref: "/plus",
    placements: {
      homepageLeaderboard: { enabled: false, slotId: "" },
      articleInline: { enabled: false, slotId: "" },
      sectionInline: { enabled: false, slotId: "" },
    },
  },
  easterEgg: { ...defaultEasterEggConfiguration },
  studio: {
    modules: { ...defaultStudioModules },
    experience: { ...defaultStudioConfiguration.experience },
    notifications: { ...defaultStudioConfiguration.notifications },
    editorialWorkflow: { ...defaultStudioConfiguration.editorialWorkflow },
    automations: { ...defaultStudioConfiguration.automations },
  },
  registry: { schemaVersion: 1, platformOverrides: {} },
};

export function normalizePublisherId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("ca-") ? trimmed : `ca-${trimmed}`;
}

export function isGoogleAdsLive(configuration: SiteConfiguration) {
  const advertising = configuration.advertising;
  return advertising.enabled &&
    !advertising.previewMode &&
    advertising.privacyMessageConfigured &&
    /^(?:ca-)?pub-\d{16}$/.test(advertising.publisherId);
}

export function isGoogleAnalyticsLive(configuration: SiteConfiguration) {
  const googleAnalytics = configuration.measurement.googleAnalytics;
  return googleAnalytics.enabled &&
    /^G-[A-Z0-9]{6,20}$/.test(googleAnalytics.measurementId);
}

export function parseNavigation(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());
      return { label: label ?? "", href: href ?? "" };
    });
}

export function formatNavigation(navigation: SiteConfiguration["navigation"]) {
  return navigation.map((item) => `${item.label} | ${item.href}`).join("\n");
}

export function parseDatelines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatDatelines(datelines: SiteConfiguration["editorial"]["datelines"]) {
  return datelines.join("\n");
}

export const getSiteConfiguration = cache(async function getSiteConfiguration() {
  if (!hasDatabase()) return defaultSiteConfiguration;
  try {
    const [record] = await getDb()
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, siteConfigurationKey))
      .limit(1);
    const parsed = siteConfigurationSchema.safeParse(record?.value);
    if (parsed.success) {
      return {
        ...parsed.data,
        navigation: include20Under20Navigation(parsed.data.navigation),
      };
    }
    if (record) console.error("Stored site configuration is invalid", parsed.error.flatten());
  } catch (error) {
    console.error("Site configuration lookup failed", error);
  }
  return defaultSiteConfiguration;
});

export async function getSiteConfigurationRecord() {
  const configuration = await getSiteConfiguration();
  if (!hasDatabase()) return { configuration, updatedAt: null, updatedByClerkId: null, revision: 0 };
  try {
    const [record] = await getDb()
      .select({ updatedAt: siteSettings.updatedAt, updatedByClerkId: siteSettings.updatedByClerkId, revision: siteSettings.revision })
      .from(siteSettings)
      .where(eq(siteSettings.key, siteConfigurationKey))
      .limit(1);
    return { configuration, updatedAt: record?.updatedAt ?? null, updatedByClerkId: record?.updatedByClerkId ?? null, revision: record?.revision ?? 0 };
  } catch (error) {
    console.error("Site configuration metadata lookup failed", error);
    return { configuration, updatedAt: null, updatedByClerkId: null, revision: 0 };
  }
}

export class StaleSiteConfigurationError extends Error {
  constructor() { super("Production configuration changed in another session. Reload before applying these edits."); this.name = "StaleSiteConfigurationError"; }
}

export async function saveSiteConfiguration(configuration: SiteConfiguration, clerkId: string, options: { expectedRevision: number; reason: string; affectedPlatforms: string[]; affectedFeatures?: string[]; environment?: "development" | "preview" | "staging" | "production"; rolledBackFromRevision?: number }) {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select().from(siteSettings).where(eq(siteSettings.key, siteConfigurationKey)).limit(1);
    if ((existing?.revision ?? 0) !== options.expectedRevision) throw new StaleSiteConfigurationError();
    const nextRevision = options.expectedRevision + 1;
    const now = new Date();
    const [record] = existing
      ? await tx.update(siteSettings).set({ value: configuration, updatedByClerkId: clerkId, updatedAt: now, revision: nextRevision }).where(and(eq(siteSettings.key, siteConfigurationKey), eq(siteSettings.revision, options.expectedRevision))).returning({ value: siteSettings.value, updatedAt: siteSettings.updatedAt, updatedByClerkId: siteSettings.updatedByClerkId, revision: siteSettings.revision })
      : await tx.insert(siteSettings).values({ key: siteConfigurationKey, value: configuration, updatedByClerkId: clerkId, revision: nextRevision }).returning({ value: siteSettings.value, updatedAt: siteSettings.updatedAt, updatedByClerkId: siteSettings.updatedByClerkId, revision: siteSettings.revision });
    if (!record) throw new StaleSiteConfigurationError();
    await tx.insert(siteConfigurationRevisions).values({ settingKey: siteConfigurationKey, revision: nextRevision, value: configuration, previousValue: existing?.value ?? defaultSiteConfiguration, reason: options.reason, environment: options.environment ?? "production", affectedPlatforms: options.affectedPlatforms, affectedFeatures: options.affectedFeatures ?? [], changedByClerkId: clerkId, rolledBackFromRevision: options.rolledBackFromRevision });
    return record;
  });
}

export async function getSiteConfigurationHistory(limit = 25) {
  if (!hasDatabase()) return [];
  return getDb().select().from(siteConfigurationRevisions).where(eq(siteConfigurationRevisions.settingKey, siteConfigurationKey)).orderBy(desc(siteConfigurationRevisions.revision)).limit(Math.min(limit, 100));
}

export async function rollbackSiteConfiguration(input: { revision: number; expectedRevision: number; clerkId: string; reason: string }) {
  const [target] = await getDb().select().from(siteConfigurationRevisions).where(and(eq(siteConfigurationRevisions.settingKey, siteConfigurationKey), eq(siteConfigurationRevisions.revision, input.revision))).limit(1);
  if (!target) throw new Error("Configuration revision not found");
  const parsed = siteConfigurationSchema.parse(target.value);
  return saveSiteConfiguration(parsed, input.clerkId, { expectedRevision: input.expectedRevision, reason: input.reason, affectedPlatforms: ["all"], rolledBackFromRevision: input.revision });
}
