import type { Metadata } from "next";
import Image from "next/image";
import { Check, FileArchive, FileText, ShieldCheck } from "lucide-react";
import { PressKitForm } from "@/components/press-kit-form";
import { brandAssets } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Press kit",
  description: "Request and instantly generate an official New Jersey Courier media package with logos, publication background and editorial artwork.",
  alternates: { canonical: "/press" },
};

export default function PressPage() {
  return (
    <div>
      <section className="border-b bg-brand-navy text-white">
        <div className="container-news grid gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div><p className="eyebrow text-brand-yellow">Newsroom resources</p><h1 className="headline-balance mt-4 max-w-3xl text-5xl font-black tracking-[-0.055em] sm:text-6xl">The Courier, ready for your newsroom.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">Generate a tailored, publication-ready ZIP for reporting, broadcast, podcasts, events or research. Every package includes your request details, a checksum manifest and clear usage guidance.</p><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75"><span className="flex items-center gap-2"><Check className="size-4 text-brand-yellow" /> Immediate download</span><span className="flex items-center gap-2"><Check className="size-4 text-brand-yellow" /> SVG and high-resolution artwork</span><span className="flex items-center gap-2"><Check className="size-4 text-brand-yellow" /> Request-specific manifest</span></div></div>
          <div className="relative overflow-hidden border border-white/15 bg-white/5 p-3"><Image src={brandAssets.gardenStateEngraving} alt="Illustrated New Jersey landscape used in The New Jersey Courier brand library" width={1600} height={1000} className="aspect-[8/5] w-full object-cover" priority /><div className="absolute inset-x-3 bottom-3 bg-brand-navy/92 p-4 backdrop-blur"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-yellow">Editorial asset</p><p className="mt-1 text-sm text-white/76">High-resolution artwork ships with attribution and non-documentary-use notes.</p></div></div>
        </div>
      </section>

      <section className="container-news grid gap-10 py-12 lg:grid-cols-[0.68fr_1.32fr] lg:items-start lg:py-16">
        <div className="space-y-8 lg:sticky lg:top-24">
          <div><p className="eyebrow text-brand-blue">Inside every package</p><h2 className="mt-3 text-3xl font-black tracking-tight text-brand-navy">Useful files, clearly labeled.</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">Choose only what your assignment needs. The generator never searches private newsroom files and can package only the approved public asset library.</p></div>
          <Feature icon={<FileArchive />} title="One organized ZIP" detail="Brand, editorial, publication and request folders use stable filenames." />
          <Feature icon={<FileText />} title="Editorial background" detail="Boilerplate, fact sheet, brand guide and request summary are plain-text and easy to quote or share internally." />
          <Feature icon={<ShieldCheck />} title="Verification built in" detail="A JSON manifest records the request ID, creation time, selected groups, file sizes and SHA-256 checksums." />
          <div className="border-l-4 border-brand-yellow bg-brand-sky/60 p-5 text-sm leading-6 text-brand-navy"><strong>Operational notice:</strong> A monitored press contact and final legal-entity details have not yet been configured. Generated packages disclose that status and do not invent contact information.</div>
        </div>
        <PressKitForm />
      </section>
    </div>
  );
}

function Feature({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-sky text-brand-blue [&_svg]:size-5">{icon}</span><div><h3 className="font-bold text-brand-navy">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div></div>;
}
