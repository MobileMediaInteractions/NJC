import { desc, eq, isNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { liveEvents, siteSettings } from "@harborline/backend/schema";
import type { LiveSnapshot } from "@harborline/contracts";
import { siteConfig } from "@/lib/site";

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  let enabled: boolean = siteConfig.live.enabled;
  let title: string = siteConfig.live.label;
  let streamUrl: string | null = siteConfig.live.streamUrl || null;

  if (hasDatabase()) {
    try {
      const db = getDb();
      const [[setting], [activeEvent]] = await Promise.all([
        db.select().from(siteSettings).where(eq(siteSettings.key, "live_banner")).limit(1),
        db
          .select()
          .from(liveEvents)
          .where(isNull(liveEvents.endedAt))
          .orderBy(desc(liveEvents.isLive), desc(liveEvents.startedAt), desc(liveEvents.createdAt))
          .limit(1),
      ]);

      if (activeEvent?.isLive) {
        enabled = true;
        title = activeEvent.title;
        streamUrl = activeEvent.streamUrl || streamUrl;
      }

      if (setting && typeof setting.value === "object" && setting.value && "enabled" in setting.value) {
        enabled = Boolean((setting.value as { enabled: unknown }).enabled);
      }
    } catch (error) {
      console.error("Live setting lookup failed", error);
    }
  }
  return {
    isLive: enabled,
    title,
    streamUrl,
    schedule: [] as Array<{ startsAt: string; title: string }>,
  };
}
