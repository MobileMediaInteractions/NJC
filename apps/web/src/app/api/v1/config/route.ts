import { NextResponse } from "next/server";
import { hasDatabase } from "@harborline/backend/db";
import { getLiveSnapshot } from "@/lib/live";
import { getSiteConfiguration, isGoogleAdsLive } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseAvailable = hasDatabase();
  const configuration = await getSiteConfiguration();
  const { publication, features } = configuration;
  const newsletterAvailable = features.newsletters && (databaseAvailable || Boolean(process.env.NEWSLETTER_WEBHOOK_URL));
  const live = await getLiveSnapshot();

  return NextResponse.json({
    data: {
      ...publication,
      navigation: configuration.navigation,
      live: { enabled: live.isLive, label: live.title, streamUrl: live.streamUrl ?? "" },
      features: {
        comments: features.comments && databaseAvailable,
        newsletters: newsletterAvailable,
        alerts: features.alerts && databaseAvailable,
        liveVideo: features.liveVideo && live.isLive && Boolean(live.streamUrl),
        weather: features.weather,
        membership: features.membership,
        donations: features.donations,
        advertising: isGoogleAdsLive(configuration),
      },
    },
    meta: { apiVersion: "1" },
  });
}
