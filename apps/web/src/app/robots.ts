import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/origin";
import { isSearchIndexingEnabled } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteOrigin();
  const indexingEnabled = isSearchIndexingEnabled();

  return {
    rules: indexingEnabled
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/studio/", "/sign-in/", "/sign-up/", "/login/", "/search"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: [`${base}/sitemap.xml`, `${base}/news-sitemap.xml`],
    host: base,
  };
}
