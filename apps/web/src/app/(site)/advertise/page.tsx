import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Advertise" };
export default function AdvertisePage() { return <InfoPage eyebrow="For local businesses" title="Reach the region without losing the neighborhood." intro="The New Jersey Courier’s advertising system is built in and disabled for the fictional launch."><section><h2 className="text-2xl font-black text-brand-navy">Available later</h2><p className="mt-3">The product includes clearly labeled display inventory, sponsored newsletter placements and category sponsorships. Paid content never enters the editorial workflow and can be disabled globally.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Designed for trust</h2><p className="mt-3">No intrusive interstitials, autoplay audio or ads disguised as reporting. Inventory has fixed placements that preserve reading performance and accessibility.</p></section></InfoPage>; }
