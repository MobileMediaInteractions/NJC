import type { Metadata } from "next";
import Link from "next/link";
import { Radio, Tv } from "lucide-react";
import { LiveCoverageCard } from "@/components/live-coverage-card";
import { Button } from "@/components/ui/button";
import { getLiveSnapshot } from "@/lib/live";
import { getPublicLiveEvents } from "@/lib/live-coverage";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getResolvedSiteDesign } from "@/lib/site-design";

export const metadata: Metadata = { title: "Live" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const [live, desks, configuration] = await Promise.all([
    getLiveSnapshot(),
    getPublicLiveEvents(30).catch((error) => {
      console.error("Live desk index lookup failed", error);
      return [];
    }),
    getSiteConfiguration(),
  ]);
  const design = await getResolvedSiteDesign(configuration);
  const canWatch = live.isLive && Boolean(live.streamUrl);
  const active = desks.filter((event) => event.status === "live" || event.status === "paused");
  const upcoming = desks.filter((event) => event.status === "scheduled");
  const completed = desks.filter((event) => event.status === "ended" || event.status === "archived");

  return (
    <div className={design === "v2" ? "v2-live-index" : undefined}>
      <section className="bg-[#031724] py-12 text-white">
        <div className="container-news">
        <p className="eyebrow flex items-center gap-2 text-brand-yellow"><Radio className={`size-4 ${canWatch ? "text-brand-red" : "text-white/45"}`} /> Live channel</p>
        <h1 className="mt-2 text-5xl font-black tracking-[-0.055em] sm:text-6xl">{active.length ? "Live reporting from the Courier" : canWatch ? live.title : "The New Jersey Courier Now"}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/65">Minute-by-minute local reporting, verified by the newsroom and preserved as a complete public timeline.</p>
        {active.length ? <div className="mt-9 grid gap-5">{active.map((event, index) => <LiveCoverageCard key={event.id} event={event} featured={index === 0} />)}</div> : <div className="mt-8 grid aspect-video max-h-[70vh] place-items-center overflow-hidden border border-white/10 bg-black">
          {canWatch ? <video className="h-full w-full bg-black" src={live.streamUrl!} controls autoPlay playsInline aria-label={live.title} /> : <div className="max-w-lg px-6 text-center"><Tv className="mx-auto size-12 text-white/30" /><h2 className="mt-5 text-2xl font-bold">The live channel is off air.</h2><p className="mt-3 text-sm leading-6 text-white/55">There is no active newsroom broadcast. This page will use the verified stream configured by the newsroom when coverage begins.</p><Button asChild className="mt-6 bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90"><Link href="/watch">Browse published video</Link></Button></div>}
        </div>}
        </div>
      </section>
      {upcoming.length ? <section className="container-news py-12"><p className="eyebrow text-brand-blue">On the calendar</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-brand-navy dark:text-foreground">Upcoming live desks</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{upcoming.map((event) => <LiveCoverageCard key={event.id} event={event} />)}</div></section> : null}
      {completed.length ? <section className="border-t bg-card/35 py-12"><div className="container-news"><p className="eyebrow text-brand-blue">The complete record</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-brand-navy dark:text-foreground">Recent live coverage</h2><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{completed.map((event) => <LiveCoverageCard key={event.id} event={event} />)}</div></div></section> : null}
    </div>
  );
}
