import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { TipForm } from "@/components/tip-form";

export const metadata: Metadata = { title: "Submit a news tip" };
export default function TipsPage() { return <InfoPage eyebrow="Contact the newsroom" title="What should Middlesex County know?" intro="Share a story idea, document, photo or observation with The New Jersey Courier assignment desk."><TipForm /></InfoPage>; }
