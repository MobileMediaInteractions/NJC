import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";

export function GET() {
  return NextResponse.json({ data: { isLive: siteConfig.live.enabled, title: siteConfig.live.label, streamUrl: siteConfig.live.streamUrl || null, schedule: [{ startsAt: "15:30", title: "Harborline Afternoon" }, { startsAt: "16:00", title: "The County Desk" }, { startsAt: "18:00", title: "Harborline at Six" }] }, meta: { apiVersion: "1" } });
}
