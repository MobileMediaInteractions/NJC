import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/status/collect"] }, sitemap: "https://status.thejerseycourier.com/sitemap.xml", host: "https://status.thejerseycourier.com" };
}
