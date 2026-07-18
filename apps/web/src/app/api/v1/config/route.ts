import { NextResponse } from "next/server";
import { hasDatabase } from "@harborline/backend/db";
import { getLiveSnapshot } from "@/lib/live";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseAvailable = hasDatabase();
  const newsletterAvailable = databaseAvailable || Boolean(process.env.NEWSLETTER_WEBHOOK_URL);
  const live = await getLiveSnapshot();

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
      live: { enabled: live.isLive, label: live.title, streamUrl: live.streamUrl ?? "" },
      features: {
        comments: databaseAvailable,
        newsletters: newsletterAvailable,
        alerts: databaseAvailable,
        liveVideo: live.isLive && Boolean(live.streamUrl),
        weather: true,
      },
    },
    meta: { apiVersion: "1" },
  });
}
