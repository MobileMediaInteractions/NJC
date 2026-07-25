import type { MetadataRoute } from "next";
import { getPublishedStoryIndex } from "@/lib/content";
import { getSiteOrigin } from "@/lib/origin";
import { getPublicStaffProfilePaths } from "@/lib/staff-profiles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const [stories, staffProfilePaths] = await Promise.all([
    getPublishedStoryIndex({ limit: 49_900 }),
    getPublicStaffProfilePaths().catch((error) => {
      console.error("Public staff sitemap lookup failed", error);
      return [];
    }),
  ]);
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
  ];
}
