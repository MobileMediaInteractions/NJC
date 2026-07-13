import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Terms" };
export default function TermsPage() { return <InfoPage title="Terms of use" intro="These product placeholders must be replaced with counsel-approved terms before a commercial launch."><section><h2 className="text-2xl font-black text-brand-navy">Community participation</h2><p className="mt-3">Readers may not submit unlawful, threatening, harassing or deliberately misleading material. Comments are moderated and may be removed.</p></section><section><h2 className="text-2xl font-black text-brand-navy">Content rights</h2><p className="mt-3">Harborline reporting and original media remain protected by applicable copyright law. Submission terms for tips and user media must be finalized for the operating entity.</p></section></InfoPage>; }
