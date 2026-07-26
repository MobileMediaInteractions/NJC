import type { Metadata } from "next";
import { AudienceTracker } from "@/components/audience-tracker";
import { NjcPlusFooter } from "@/components/njc-plus/brand";
import { getSiteOrigin } from "@/lib/origin";
import { isNjcPlusPublicEnabled } from "@/lib/feature-flags";
import { njcPlusAssets } from "@/lib/njc-plus-assets";
import "./plus.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const enabled = await isNjcPlusPublicEnabled();
  return {
    metadataBase: new URL(getSiteOrigin()),
    title: { default: "NJC+ | Reporting in motion", template: "%s | NJC+" },
    description: "Premium investigations, original video, shows, podcasts and live New Jersey coverage from The New Jersey Courier.",
    applicationName: "NJC+",
    icons: { icon: njcPlusAssets.icon },
    openGraph: { siteName: "NJC+", title: "NJC+ | Reporting in motion", description: "Premium journalism, film and sound from The New Jersey Courier.", images: [njcPlusAssets.signalField] },
    twitter: { card: "summary_large_image", title: "NJC+", images: [njcPlusAssets.signalField] },
    robots: { index: enabled, follow: enabled },
  };
}

export default function NjcPlusLayout({ children }: { children: React.ReactNode }) {
  return <div className="njc-plus"><AudienceTracker />{children}<NjcPlusFooter /></div>;
}
