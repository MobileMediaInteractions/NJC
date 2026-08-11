import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://status.thejerseycourier.com", changeFrequency: "hourly", priority: 1 }];
}
