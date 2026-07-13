import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";

export const revalidate = 3600;

export function GET() {
  return NextResponse.json({
    data: {
      name: siteConfig.name,
      shortName: siteConfig.shortName,
      tagline: siteConfig.tagline,
      description: siteConfig.description,
      region: siteConfig.region,
      city: siteConfig.city,
      state: siteConfig.state,
      station: siteConfig.station,
      timezone: siteConfig.timezone,
      navigation: siteConfig.navigation,
      live: siteConfig.live,
      features: {
        comments: true,
        newsletters: true,
        alerts: true,
        liveVideo: true,
        weather: true,
      },
    },
    meta: { apiVersion: "1" },
  });
}
