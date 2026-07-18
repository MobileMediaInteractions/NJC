import type { Metadata } from "next";
import Link from "next/link";
import { Radio, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLiveSnapshot } from "@/lib/live";

export const metadata: Metadata = { title: "Live" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const live = await getLiveSnapshot();
  const canWatch = live.isLive && Boolean(live.streamUrl);

  return (
    <div className="bg-[#031724] py-12 text-white">
      <div className="container-news">
        <p className="eyebrow flex items-center gap-2 text-brand-yellow"><Radio className={`size-4 ${canWatch ? "text-brand-red" : "text-white/45"}`} /> Live channel</p>
        <h1 className="mt-2 text-5xl font-black tracking-[-0.055em]">{canWatch ? live.title : "The New Jersey Courier Now"}</h1>
        <div className="mt-8 grid aspect-video max-h-[70vh] place-items-center overflow-hidden border border-white/10 bg-black">
          {canWatch ? <video className="h-full w-full bg-black" src={live.streamUrl!} controls autoPlay playsInline aria-label={live.title} /> : <div className="max-w-lg px-6 text-center"><Tv className="mx-auto size-12 text-white/30" /><h2 className="mt-5 text-2xl font-bold">The live channel is off air.</h2><p className="mt-3 text-sm leading-6 text-white/55">There is no active newsroom broadcast. This page will use the verified stream configured by the newsroom when coverage begins.</p><Button asChild className="mt-6 bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90"><Link href="/watch">Browse published video</Link></Button></div>}
        </div>
      </div>
    </div>
  );
}
