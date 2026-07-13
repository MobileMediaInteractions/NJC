import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() { return <div className="grid min-h-screen place-items-center bg-brand-navy p-6 text-white"><div className="max-w-xl text-center"><div className="mb-10 flex justify-center"><BrandMark inverse /></div><p className="eyebrow text-brand-yellow">404 · Off the chart</p><h1 className="mt-3 text-5xl font-black tracking-[-0.055em]">We couldn’t find that page.</h1><p className="mt-4 text-white/60">The story may have moved, or the tide took this link out.</p><Button asChild className="mt-7 bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90"><Link href="/">Return to the front page</Link></Button></div></div>; }
