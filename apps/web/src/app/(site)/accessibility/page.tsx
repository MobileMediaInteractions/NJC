import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Accessibility" };
export default function AccessibilityPage() { return <InfoPage title="News should work for everyone." intro="Harborline is designed for keyboard access, readable contrast, reduced motion and assistive technology."><section><h2 className="text-2xl font-black text-brand-navy">Our target</h2><p className="mt-3">The site targets WCAG 2.2 AA. Navigation, forms and media controls use semantic labels, clear focus states and predictable reading order.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Ongoing review</h2><p className="mt-3">Accessibility is part of editorial and product QA. Captions, transcripts, image descriptions and plain-language alerts belong in the newsroom workflow.</p></section></InfoPage>; }
