import type { Metadata } from "next";
import Link from "next/link";
import { Radio, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Live" };

export default function LivePage() {
  return (
    <div className="bg-[#031724] py-12 text-white">
      <div className="container-news">
        <p className="eyebrow flex items-center gap-2 text-brand-yellow"><Radio className="size-4" /> Live channel</p>
        <h1 className="mt-2 text-5xl font-black tracking-[-0.055em]">Harborline Now</h1>
        <div className="mt-8 grid aspect-video max-h-[70vh] place-items-center border border-white/10 bg-black">
          <div className="max-w-lg px-6 text-center"><Tv className="mx-auto size-12 text-white/30" /><h2 className="mt-5 text-2xl font-bold">Stream connection ready</h2><p className="mt-3 text-sm leading-6 text-white/55">Add the station’s HLS, Mux or YouTube Live URL in the site configuration to activate playback across web and future mobile apps.</p><Button asChild className="mt-6 bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90"><Link href="/watch">Browse latest video</Link></Button></div>
        </div>
      </div>
    </div>
  );
}
