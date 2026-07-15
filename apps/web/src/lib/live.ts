import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { siteSettings } from "@harborline/backend/schema";
import { siteConfig } from "@/lib/site";

export async function getLiveSnapshot() {
  let enabled: boolean = siteConfig.live.enabled;
  if (hasDatabase()) {
    try {
      const [setting] = await getDb().select().from(siteSettings).where(eq(siteSettings.key, "live_banner")).limit(1);
      if (setting && typeof setting.value === "object" && setting.value && "enabled" in setting.value) {
        enabled = Boolean((setting.value as { enabled: unknown }).enabled);
      }
    } catch (error) {
      console.error("Live setting lookup failed", error);
    }
  }
  return {
    isLive: enabled,
    title: siteConfig.live.label,
    streamUrl: siteConfig.live.streamUrl || null,
    schedule: [
      { startsAt: "15:30", title: "The New Jersey Courier Afternoon" },
      { startsAt: "16:00", title: "The County Desk" },
      { startsAt: "18:00", title: "The New Jersey Courier at Six" },
    ],
  };
}
