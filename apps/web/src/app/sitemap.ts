import type { MetadataRoute } from "next";
import { getPublishedStoryIndex } from "@/lib/content";
import { getSiteOrigin } from "@/lib/origin";
import { getPublicStaffProfilePaths } from "@/lib/staff-profiles";
import { getNjcPlusFlags, isNjcPlusPublicEnabled } from "@/lib/feature-flags";
import { filterPremiumContentByFlags, getPublishedPremiumContent } from "@/lib/njc-plus";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const plusEnabled = await isNjcPlusPublicEnabled();
  const [stories, staffProfilePaths, premiumUnfiltered, plusFlags] = await Promise.all([
    getPublishedStoryIndex({ limit: 49_900 }),
    getPublicStaffProfilePaths().catch((error) => {
      console.error("Public staff sitemap lookup failed", error);
      return [];
    }),
    plusEnabled ? getPublishedPremiumContent({ limit: 10_000 }) : Promise.resolve([]),
    plusEnabled ? getNjcPlusFlags() : Promise.resolve([]),
  ]);
  const premium = plusEnabled ? await filterPremiumContentByFlags(premiumUnfiltered) : [];
  const plusFeature = new Map(plusFlags.map((flag) => [flag.key, flag.effective]));
  const routes = [
    "",
    "/latest",
    "/category/middlesex",
    "/category/statehouse",
    "/category/public-square",
    "/category/investigates",
    "/category/sports",
    "/category/opinion",
    "/newsletter",
    "/press",
    "/about",
    "/20-under-20",
    "/staff",
    ...staffProfilePaths,
  ];

  return [
    ...routes.map((route) => ({
      url: `${base}${route}`,
      changeFrequency: route === "" ? ("hourly" as const) : ("daily" as const),
      priority: route === "" ? 1 : 0.7,
    })),
    ...stories.map((story) => ({
      url: `${base}/story/${story.slug}`,
      lastModified: new Date(story.updatedAt ?? story.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...(plusEnabled ? [
      { url: `${base}/plus`, changeFrequency: "hourly" as const, priority: 0.9 },
      ...(plusFeature.get("njc_plus_video") ? [{ url: `${base}/plus/watch`, changeFrequency: "daily" as const, priority: 0.8 }] : []),
      ...(plusFeature.get("njc_plus_audio") || plusFeature.get("njc_plus_podcasts") ? [{ url: `${base}/plus/listen`, changeFrequency: "daily" as const, priority: 0.8 }] : []),
      ...(plusFeature.get("njc_plus_live") ? [{ url: `${base}/plus/live`, changeFrequency: "hourly" as const, priority: 0.8 }] : []),
      ...(plusFeature.get("njc_plus_search") ? [{ url: `${base}/plus/search`, changeFrequency: "daily" as const, priority: 0.7 }] : []),
      ...premium.filter((item) => !item.noIndex).map((item) => ({
        url: `${base}/plus/${item.slug}`,
        lastModified: item.updatedAt,
        changeFrequency: "weekly" as const,
        priority: item.isFeatured ? 0.9 : 0.8,
      })),
    ] : []),
  ];
}
