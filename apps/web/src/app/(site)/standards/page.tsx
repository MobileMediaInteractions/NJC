import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Editorial Standards and Corrections",
  description: "The New Jersey Courier’s standards for accuracy, sourcing, corrections, independence and clearly labeled sponsored material.",
  alternates: { canonical: "/standards" },
};
export default function StandardsPage() { return <InfoPage title="How The New Jersey Courier earns trust" intro="Accuracy, transparency and independence guide every story and every correction."><section><h2 className="text-2xl font-black text-brand-navy">Accuracy before speed</h2><p className="mt-3">Breaking coverage is clearly labeled and updated as facts change. Material claims are sourced, and anonymous sourcing requires editor approval.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Corrections</h2><p className="mt-3">We correct factual errors promptly and attach a plain-language note explaining what changed. Story revisions remain available to authorized editors.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Independence</h2><p className="mt-3">Editorial decisions are separated from advertising, membership and donor relationships. Sponsored material is labeled before a reader opens it.</p></section></InfoPage>; }
