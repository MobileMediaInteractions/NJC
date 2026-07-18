import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play, Radio, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublishedStories } from "@/lib/content";
import { getLiveSnapshot } from "@/lib/live";

export const metadata: Metadata = { title: "Watch" };
export const dynamic = "force-dynamic";

export default async function WatchPage() {
  const [live, publishedStories] = await Promise.all([
    getLiveSnapshot(),
    getPublishedStories({ limit: 50 }),
  ]);
  const stories = publishedStories.filter((story) => Boolean(story.videoUrl)).slice(0, 6);
  const preview = stories[0];
  const canWatchLive = live.isLive && Boolean(live.streamUrl);

  return (
    <div className="bg-[#041e31] pb-16 text-white">
      <section className="container-news py-10">
        <div className="flex items-center gap-2"><Radio className={`size-4 ${canWatchLive ? "text-brand-red" : "text-white/45"}`} /><p className="eyebrow text-brand-yellow">The New Jersey Courier Now</p></div>
        <h1 className="mt-2 text-5xl font-black tracking-[-0.055em] sm:text-6xl">Watch local.</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="relative aspect-video overflow-hidden bg-black">
            {preview ? <Image src={preview.image} alt={preview.imageAlt} fill priority sizes="75vw" className="object-cover opacity-45" /> : null}
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              {canWatchLive ? (
                <Button asChild size="lg" className="rounded-full bg-white text-brand-navy hover:bg-white/90"><Link href="/live"><Play className="fill-current" /> Start live stream</Link></Button>
              ) : (
                <div className="max-w-md"><Tv className="mx-auto size-10 text-white/30" /><h2 className="mt-4 text-2xl font-bold">The live channel is off air.</h2><p className="mt-2 text-sm leading-6 text-white/55">Live coverage will appear here when the newsroom begins a verified broadcast.</p></div>
              )}
            </div>
            {canWatchLive ? <span className="absolute left-4 top-4 bg-brand-red px-3 py-1 text-xs font-bold uppercase tracking-wider">Live</span> : null}
          </div>
          <aside className="border-t-4 border-brand-yellow bg-white/5 p-6"><p className="eyebrow text-brand-yellow">{canWatchLive ? "On now" : "Broadcast status"}</p><h2 className="mt-3 text-2xl font-bold">{canWatchLive ? live.title : "Currently off air"}</h2><p className="mt-3 text-sm leading-6 text-white/60">{canWatchLive ? "Watch the newsroom’s current live coverage." : "No live stream has been scheduled or activated. Published video reports remain available below."}</p>{live.schedule[0] ? <div className="mt-6 border-t border-white/15 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-white/50">Up next · {new Date(live.schedule[0].startsAt).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })}</p><p className="mt-1 font-semibold">{live.schedule[0].title}</p></div> : null}</aside>
        </div>
      </section>
      <section className="container-news mt-6"><h2 className="border-t border-white/20 pt-6 text-3xl font-black tracking-[-0.04em]">Latest video</h2>{stories.length > 0 ? <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{stories.map((story) => <article key={story.id}><Link href={`/story/${story.slug}`} className="group block"><div className="relative aspect-video overflow-hidden bg-black"><Image src={story.image} alt={story.imageAlt} fill sizes="33vw" className="object-cover opacity-80 transition-transform group-hover:scale-[1.03]" /><span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-white text-brand-navy"><Play className="size-4 fill-current" /></span></div><p className="eyebrow mt-4 text-brand-yellow">{story.categoryLabel}</p><h3 className="mt-1 text-xl font-bold leading-tight">{story.headline}</h3></Link></article>)}</div> : <div className="mt-6 border-y border-white/15 py-12 text-center"><p className="text-lg font-bold">No video reports have been published yet.</p><p className="mt-2 text-sm text-white/55">Verified newsroom video will appear here after publication.</p><Button asChild variant="outline" className="mt-5 border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/latest">Read the latest reporting</Link></Button></div>}</section>
    </div>
  );
}
