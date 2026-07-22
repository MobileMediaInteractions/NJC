import { eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { siteSettings } from "@harborline/backend/schema";
import { siteConfig } from "@/lib/site";

export const siteConfigurationKey = "site_configuration_v1";
export const defaultDatelines = [
  "New Brunswick",
  "Middlesex County",
  "Trenton",
  "Edison",
  "Woodbridge",
] as const;

const navigationItemSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: z.string().trim().regex(/^\/[A-Za-z0-9/_-]*$/, "Navigation links must be local paths beginning with /").max(160),
});

const adPlacementSchema = z.object({
  enabled: z.boolean(),
  slotId: z.string().trim().refine((value) => value === "" || /^\d{10}$/.test(value), "Ad unit IDs must contain 10 digits"),
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
    placements: z.object({
      homepageLeaderboard: adPlacementSchema,
      articleInline: adPlacementSchema,
      sectionInline: adPlacementSchema,
    }),
  }),
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
  },
  editorial: {
    datelines: [...defaultDatelines],
  },
  advertising: {
    enabled: false,
    provider: "google-adsense",
    publisherId: "",
    autoAds: false,
    previewMode: true,
    privacyMessageConfigured: false,
    adsTxtEnabled: false,
    placements: {
      homepageLeaderboard: { enabled: false, slotId: "" },
      articleInline: { enabled: false, slotId: "" },
      sectionInline: { enabled: false, slotId: "" },
    },
  },
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
    if (parsed.success) return parsed.data;
    if (record) console.error("Stored site configuration is invalid", parsed.error.flatten());
  } catch (error) {
    console.error("Site configuration lookup failed", error);
  }
  return defaultSiteConfiguration;
});

export async function getSiteConfigurationRecord() {
  const configuration = await getSiteConfiguration();
  if (!hasDatabase()) return { configuration, updatedAt: null, updatedByClerkId: null };
  try {
    const [record] = await getDb()
      .select({ updatedAt: siteSettings.updatedAt, updatedByClerkId: siteSettings.updatedByClerkId })
      .from(siteSettings)
      .where(eq(siteSettings.key, siteConfigurationKey))
      .limit(1);
    return { configuration, updatedAt: record?.updatedAt ?? null, updatedByClerkId: record?.updatedByClerkId ?? null };
  } catch (error) {
    console.error("Site configuration metadata lookup failed", error);
    return { configuration, updatedAt: null, updatedByClerkId: null };
  }
}

export async function saveSiteConfiguration(configuration: SiteConfiguration, clerkId: string) {
  const [record] = await getDb()
    .insert(siteSettings)
    .values({ key: siteConfigurationKey, value: configuration, updatedByClerkId: clerkId })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: configuration, updatedByClerkId: clerkId, updatedAt: new Date() },
    })
    .returning({ value: siteSettings.value, updatedAt: siteSettings.updatedAt, updatedByClerkId: siteSettings.updatedByClerkId });
  if (!record) throw new Error("Site configuration was not returned after saving");
  return record;
}
