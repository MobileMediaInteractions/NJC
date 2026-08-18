import type { Metadata } from "next";
import { NjcPlusFooter } from "@/components/njc-plus/brand";
import { courierCutOrigin } from "@/lib/courier-cut";
import { njcPlusAssets } from "@/lib/njc-plus-assets";
import "../plus/plus.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(courierCutOrigin),
  title: { default: "The Courier Cut", template: "%s | The Courier Cut" },
  description: "Invitation-only early access to selected NJC+ productions.",
  applicationName: "The Courier Cut",
  icons: { icon: njcPlusAssets.icon },
  robots: { index: false, follow: false, nocache: true },
};

export default function CourierCutLayout({ children }: { children: React.ReactNode }) {
  return <div className="njc-plus courier-cut">{children}<NjcPlusFooter /></div>;
}

