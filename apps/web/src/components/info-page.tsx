import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InfoPage({ eyebrow = "The New Jersey Courier", title, intro, children }: { eyebrow?: string; title: string; intro: string; children: React.ReactNode }) {
  return <div className="container-news py-12"><div className="mx-auto max-w-3xl"><p className="eyebrow text-brand-blue">{eyebrow}</p><h1 className="headline-balance mt-3 text-5xl font-black tracking-[-0.055em] text-brand-navy sm:text-6xl">{title}</h1><p className="mt-5 text-xl leading-8 text-muted-foreground">{intro}</p><div className="mt-10 space-y-8 border-t-4 border-brand-navy pt-8 text-base leading-8 text-foreground/85">{children}</div><Button asChild variant="outline" className="mt-10"><Link href="/"><ArrowLeft /> Back to The New Jersey Courier</Link></Button></div></div>;
}
