import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "About The New Jersey Courier",
  description: "Meet the county-first newsroom covering Middlesex County and the New Jersey Statehouse with local context and public-service reporting.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <InfoPage title="A county newsroom built for the place it serves." intro="The New Jersey Courier is a launch-preview, independent digital newspaper starting in Middlesex County, with statewide context where local consequences begin in Trenton."><section><h2 className="text-2xl font-black text-brand-navy">Our promise</h2><p className="mt-3">We begin with the questions residents are actually asking: What changed? Who decided? What will it cost? Which town, school or street is affected? Then we report until the answers are clear.</p></section><section><h2 className="text-2xl font-black text-brand-navy">County first</h2><p className="mt-3">The launch desk covers municipal government, education, transportation, accountability, civic life and high-school sports across Middlesex County. Statehouse reporting explains how statewide policy arrives at the county and town level.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Launch-preview disclosure</h2><p className="mt-3">Stories, authors, polls and results currently shown on this site are fictional product demonstrations. They are labeled as preview material and must be replaced by sourced, edited reporting before public launch.</p></section></InfoPage>;
}
