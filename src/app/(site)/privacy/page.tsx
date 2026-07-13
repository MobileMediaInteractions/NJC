import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Privacy" };
export default function PrivacyPage() { return <InfoPage title="Privacy" intro="A launch-ready policy must be reviewed by counsel once the real company, market and vendors are established."><section><h2 className="text-2xl font-black text-brand-navy">Data minimization</h2><p className="mt-3">Harborline collects only the information needed to provide newsletters, accounts, comments, alerts and audience measurement. Sensitive newsroom tips require a separate secure intake channel.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Vendors</h2><p className="mt-3">The planned stack uses Vercel, Neon, Clerk and Vercel Blob. Optional email, analytics and payment vendors should be added to the final policy when activated.</p></section></InfoPage>; }
