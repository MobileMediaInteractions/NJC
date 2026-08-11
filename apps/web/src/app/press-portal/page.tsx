import Link from "next/link";
import { PressRequestAssistant } from "@/components/press-portal/press-request-assistant";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function PressPortalPage() {
  if (!(await getSiteConfiguration()).features.pressPortal) return <section className="mx-auto max-w-3xl px-5 py-28 text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6b1e]">Press &amp; Media</p><h1 className="mt-4 text-4xl font-black">Custom requests are temporarily paused.</h1><p className="mt-5 text-[#173e32]/65">The existing publication Press Kit remains available while this service is offline.</p><Link href="https://www.thejerseycourier.com/press" className="mt-7 inline-flex bg-[#173e32] px-5 py-3 text-sm font-bold text-white">Open the publication Press Kit</Link></section>;
  return <PressRequestAssistant />;
}
