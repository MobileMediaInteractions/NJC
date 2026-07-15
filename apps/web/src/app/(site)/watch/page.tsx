import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublishedStories } from "@/lib/content";

export const metadata: Metadata = { title: "Watch" };

export default async function WatchPage() {
  const stories = await getPublishedStories({ limit: 6 });
  return (
    <div className="bg-[#041e31] pb-16 text-white">
      <section className="container-news py-10">
        <div className="flex items-center gap-2"><Radio className="size-4 text-brand-red" /><p className="eyebrow text-brand-yellow">The New Jersey Courier Now</p></div>
        <h1 className="mt-2 text-5xl font-black tracking-[-0.055em] sm:text-6xl">Watch local.</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="relative aspect-video overflow-hidden bg-black">
            <Image src={stories[0].image} alt="The New Jersey Courier live stream preview" fill priority sizes="75vw" className="object-cover opacity-45" />
            <div className="absolute inset-0 grid place-items-center"><Button asChild size="lg" className="rounded-full bg-white text-brand-navy hover:bg-white/90"><Link href="/live"><Play className="fill-current" /> Start live stream</Link></Button></div>
            <span className="absolute left-4 top-4 bg-brand-red px-3 py-1 text-xs font-bold uppercase tracking-wider">Live</span>
          </div>
          <aside className="border-t-4 border-brand-yellow bg-white/5 p-6"><p className="eyebrow text-brand-yellow">On now</p><h2 className="mt-3 text-2xl font-bold">The New Jersey Courier Afternoon</h2><p className="mt-3 text-sm leading-6 text-white/60">Headlines, a live waterfront forecast and the stories neighbors are talking about.</p><div className="mt-6 border-t border-white/15 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-white/50">Up next · 4:00 p.m.</p><p className="mt-1 font-semibold">The County Desk</p></div></aside>
        </div>
      </section>
      <section className="container-news mt-6"><h2 className="border-t border-white/20 pt-6 text-3xl font-black tracking-[-0.04em]">Latest video</h2><div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{stories.map((story) => <article key={story.id}><Link href={`/story/${story.slug}`} className="group block"><div className="relative aspect-video overflow-hidden"><Image src={story.image} alt={story.imageAlt} fill sizes="33vw" className="object-cover opacity-80 transition-transform group-hover:scale-[1.03]" /><span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-white text-brand-navy"><Play className="size-4 fill-current" /></span></div><p className="eyebrow mt-4 text-brand-yellow">{story.categoryLabel}</p><h3 className="mt-1 text-xl font-bold leading-tight">{story.headline}</h3></Link></article>)}</div></section>
    </div>
  );
}
