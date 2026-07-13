import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { TipForm } from "@/components/tip-form";

export const metadata: Metadata = { title: "Submit a news tip" };
export default function TipsPage() { return <InfoPage eyebrow="Contact the newsroom" title="What should Harbor County know?" intro="Share a story idea, document, photo or observation with the Harborline assignment desk."><TipForm /></InfoPage>; }
