import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Armchair, AudioLines, Beaker, CarFront, Headphones, Route, ShieldCheck } from "lucide-react";
import { TwoDudesPlayer } from "@/components/podcasts/two-dudes-player";
import { Button } from "@/components/ui/button";
import { podcastAssets } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/origin";
import { twoDudesInWheelsSeries } from "@/lib/two-dudes-in-wheels";

export const metadata: Metadata = {
  title: "Two Dudes in Wheels | NJC Podcasts",
  description: twoDudesInWheelsSeries.description,
  alternates: { canonical: "/podcasts/two-dudes-in-wheels" },
  openGraph: {
    title: "Two Dudes in Wheels",
    description: twoDudesInWheelsSeries.description,
    type: "website",
    url: "/podcasts/two-dudes-in-wheels",
  },
};

export default function TwoDudesInWheelsPage() {
  const firstEpisode = twoDudesInWheelsSeries.episodes[0];
  const origin = getSiteOrigin();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: twoDudesInWheelsSeries.title,
    description: twoDudesInWheelsSeries.description,
    url: `${origin}/podcasts/two-dudes-in-wheels`,
    publisher: {
      "@type": "NewsMediaOrganization",
      name: "The New Jersey Courier",
      url: origin,
    },
  };

  return (
    <div className="bg-[#07130f] text-[#f5f2e9]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
      <section className="container-news grid min-h-[34rem] items-center gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow text-brand-yellow">{twoDudesInWheelsSeries.eyebrow} · In production</p>
          <h1 className="mt-5 text-6xl font-black leading-[0.88] tracking-[-0.075em] sm:text-7xl lg:text-[7.4rem]">Two Dudes<br /><span className="text-brand-yellow">in Wheels.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl">{twoDudesInWheelsSeries.description}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="rounded-full bg-brand-yellow px-6 text-brand-navy hover:bg-[#e6ba65]"><Link href="/newsletter"><Headphones /> Get the launch alert</Link></Button><Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"><Link href="/dev/motiondeck"><Beaker /> Try the player demo</Link></Button></div>
        </div>
        <HeroCar />
      </section>

      <section className="border-y border-white/10 bg-white/[0.035]">
        <div className="container-news grid gap-px py-12 md:grid-cols-2">
          <Perspective icon={<CarFront />} title="The driver" copy={twoDudesInWheelsSeries.hosts[0].focus} detail="What the wheel, pedals, controls and road are saying." />
          <Perspective icon={<Armchair />} title="The passenger" copy={twoDudesInWheelsSeries.hosts[1].focus} detail="The seat most reviews treat like an afterthought—until now." />
        </div>
      </section>

      <section className="container-news py-16 lg:py-24">
        <div className="mb-9 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div><p className="eyebrow text-brand-yellow">Listen with your eyes, too</p><h2 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">The car follows the conversation.</h2></div>
          <p className="max-w-2xl text-base leading-7 text-white/58 lg:justify-self-end">Each audio-only episode is built for listening first. When the hosts discuss a control, seat, storage area or road behavior, timed photography can move with the conversation—without turning the podcast into a video.</p>
        </div>
        {firstEpisode ? <TwoDudesPlayer episode={firstEpisode} /> : <PipelinePlayer />}
      </section>

      <section className="border-t border-white/10 bg-[#0b1c16]">
        <div className="container-news grid gap-8 py-14 md:grid-cols-3">
          <Feature icon={<AudioLines />} title="A living waveform">A custom waveform moves with playback, shows progress, and remains usable with reduced motion enabled.</Feature>
          <Feature icon={<Route />} title="Synchronized road book">Chapters, searchable transcript cues and timed car photography keep every detail attached to the moment it was discussed.</Feature>
          <Feature icon={<ShieldCheck />} title="Made for real listening">Custom controls, playback speed, Media Session support and accessible fallback copy work across desktop, mobile and the installed PWA.</Feature>
        </div>
      </section>
    </div>
  );
}

function HeroCar() {
  return <div className="relative min-h-80 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_70%_20%,rgba(214,164,72,.32),transparent_34%),linear-gradient(145deg,#183e32,#08130f)] shadow-2xl" role="img" aria-label="Stylized car silhouette and provisional Two Dudes in Wheels emblem"><Image src={podcastAssets.twoDudesInWheelsPlaceholderLogo} alt="" width={150} height={150} priority className="absolute left-4 top-4 z-10 size-28 object-contain opacity-90 sm:size-36" /><div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(165deg,transparent_0_44%,#0b100e_45%)]" /><svg viewBox="0 0 760 330" className="absolute inset-x-0 bottom-3 w-full drop-shadow-[0_30px_22px_rgba(0,0,0,.55)]" aria-hidden="true"><path fill="#e5e0d4" d="M112 224c17-57 53-91 111-102l103-20c50-10 95-7 143 7l111 32c35 10 65 36 82 69l12 24H105l7-10Z"/><path fill="#173e32" d="m247 132 88-17c39-8 75-5 113 6l70 20-271-9Z"/><circle cx="229" cy="235" r="51" fill="#070b09" stroke="#d6a448" strokeWidth="8"/><circle cx="565" cy="235" r="51" fill="#070b09" stroke="#d6a448" strokeWidth="8"/></svg><span className="absolute right-6 top-6 text-right text-[0.62rem] font-black uppercase tracking-[0.2em] text-white/45">Driver report<br />Passenger report<br /><b className="text-brand-yellow">Same ride</b></span></div>;
}

function Perspective({ icon, title, copy, detail }: { icon: ReactNode; title: string; copy: string; detail: string }) {
  return <article className="border-white/10 px-6 py-5 first:border-b md:first:border-b-0 md:first:border-r md:px-10"><span className="grid size-11 place-items-center rounded-full bg-brand-yellow text-brand-navy [&>svg]:size-5">{icon}</span><h2 className="mt-5 text-3xl font-black tracking-[-0.045em]">{title}</h2><p className="mt-3 max-w-xl leading-7 text-white/68">{copy}</p><p className="mt-3 text-sm font-semibold text-brand-yellow">{detail}</p></article>;
}

function PipelinePlayer() {
  return <div className="grid min-h-[32rem] place-items-center overflow-hidden rounded-[1.5rem] border border-white/12 bg-[radial-gradient(circle_at_20%_80%,rgba(214,164,72,.16),transparent_30%),#07130f] px-6 py-16 text-center"><div className="max-w-2xl"><Image src={podcastAssets.twoDudesInWheelsPlaceholderLogo} alt="Provisional Two Dudes in Wheels emblem" width={160} height={160} className="mx-auto size-28 object-contain sm:size-36" /><div className="mx-auto mt-3 flex h-16 items-center justify-center gap-1.5" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} className="w-1 rounded-full bg-brand-yellow/70" style={{ height: `${18 + ((index * 17) % 58)}%` }} />)}</div><p className="eyebrow mt-6 text-brand-yellow">The first drive is being prepared</p><h3 className="mt-3 text-3xl font-black tracking-[-0.045em]">No placeholder episode. No pretend review.</h3><p className="mt-4 leading-7 text-white/58">Courier MotionDeck will activate here when the first verified recording, transcript, waveform and licensed car photography are ready. Until then, this page stays honest about where the series is.</p></div></div>;
}

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <article><span className="text-brand-yellow [&>svg]:size-5">{icon}</span><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-white/56">{children}</p></article>;
}
