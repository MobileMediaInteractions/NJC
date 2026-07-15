import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  Landmark,
  Mail,
  MapPinned,
  ShieldCheck,
  Trophy,
  Vote,
} from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeading } from "@/components/section-heading";
import { StoryCard } from "@/components/story-card";
import { WeeklyPulse } from "@/components/weekly-pulse";
import { getPublishedStories } from "@/lib/content";
import { timeAgo } from "@/lib/format";
import { seedStories } from "@/lib/seed";
import { homePageJsonLd } from "@/lib/seo";
import type { Story } from "@/lib/types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const published = await getPublishedStories({ limit: 12 });
  const stories = [
    ...published,
    ...seedStories.filter((seed) => !published.some((story) => story.slug === seed.slug)),
  ].slice(0, 12);
  const [lead, schools, statehouse, pulse, sports, opinion, watch, laurels] = stories;

  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <div className="container-news py-4 sm:py-6">
        <AdSlot size="leaderboard" />
      </div>

      <section className="container-news border-t-4 border-brand-navy pb-10 pt-3 sm:pb-14">
        <div className="mb-5 flex items-center justify-between gap-5">
          <div>
            <p className="eyebrow text-brand-blue">Tuesday, July 14, 2026</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-brand-navy sm:text-3xl">Top Stories</h1>
          </div>
          <Link href="/latest" className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-blue hover:underline">
            All news <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.7fr)] lg:gap-9">
          <article className="border-b pb-7 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-9">
            <Link href={`/story/${lead.slug}`} className="group relative block aspect-[16/9] overflow-hidden bg-muted">
              <Image
                src={lead.image}
                alt={lead.imageAlt}
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </Link>
            <p className="eyebrow mt-4 text-brand-blue">{lead.categoryLabel} · Developing</p>
            <h2 className="headline-balance mt-2 max-w-4xl text-[2.2rem] font-black leading-[0.97] tracking-[-0.055em] text-brand-navy sm:text-[3.2rem] lg:text-[3.65rem]">
              <Link href={`/story/${lead.slug}`} className="hover:underline">{lead.headline}</Link>
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{lead.dek}</p>
            <StoryMeta story={lead} />
          </article>

          <aside aria-labelledby="latest-briefing">
            <h2 id="latest-briefing" className="border-b-2 border-brand-navy pb-2 text-sm font-black uppercase tracking-[0.11em] text-brand-navy">Latest from the newsroom</h2>
            <CompactStory story={schools} image />
            <CompactStory story={statehouse} />
            <CompactStory story={watch} />
          </aside>
        </div>
      </section>

      <section className="border-y bg-card py-9" aria-labelledby="must-read">
        <div className="container-news">
          <div className="mb-5 flex items-center justify-between border-b-2 border-brand-navy pb-2">
            <h2 id="must-read" className="text-xl font-black tracking-[-0.03em] text-brand-navy">Must Read</h2>
            <p className="hidden text-xs font-semibold text-muted-foreground sm:block">Public-service journalism and ways to take part</p>
          </div>
          <div className="grid divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
            <MustReadCard icon={<Vote />} title="The Weekly Pulse" copy="Vote on the local question of the week, then see methodology and expert context." href={`/story/${pulse.slug}`} />
            <MustReadCard icon={<Award />} title="Jersey Laurels" copy="Nominate the neighbors and organizations whose work deserves statewide recognition." href={`/story/${laurels.slug}`} />
            <MustReadCard icon={<Mail />} title="The Middlesex Morning" copy="Start weekdays with a concise county briefing and a clear look toward Trenton." href="/newsletter" />
          </div>
        </div>
      </section>

      <section className="container-news py-12 sm:py-16">
        <SectionHeading title="More Stories" href="/latest" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StoryCard story={schools} />
          <StoryCard story={statehouse} />
          <StoryCard story={pulse} />
          <StoryCard story={watch} />
        </div>
      </section>

      <div className="container-news pb-6"><AdSlot size="leaderboard" /></div>

      <section className="container-news py-10 sm:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] lg:gap-12">
          <div>
            <SectionHeading title="Middlesex County" href="/category/middlesex" kicker="Town by town" />
            <div className="grid gap-7 sm:grid-cols-[1.1fr_0.9fr]">
              <StoryCard story={schools} size="large" />
              <div className="space-y-5">
                <StoryCard story={lead} size="compact" className="border-b pb-5" />
                <StoryCard story={watch} size="compact" className="border-b pb-5" />
                <Link href="/category/middlesex" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-blue hover:underline">See all 25 municipalities <ArrowRight className="size-3.5" /></Link>
              </div>
            </div>
          </div>
          <WeeklyPulse />
        </div>
      </section>

      <section className="border-y bg-secondary/55 py-12 sm:py-16">
        <div className="container-news grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading title="Politics & Statehouse" href="/category/statehouse" />
            <StoryCard story={statehouse} size="large" />
            <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2 sm:divide-x">
              <StoryCard story={lead} size="compact" />
              <StoryCard story={watch} size="compact" className="sm:pl-5" />
            </div>
          </div>
          <div>
            <SectionHeading title="Jersey Gridiron & Court" href="/category/sports" />
            <StoryCard story={sports} size="large" />
            <div className="mt-6 flex items-center justify-between gap-5 border-t pt-5">
              <div><p className="eyebrow text-brand-blue">Reader ballot</p><p className="mt-1 font-bold text-brand-navy">Player of the Week voting is open</p></div>
              <Trophy className="size-8 shrink-0 text-brand-yellow" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-news py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:gap-12">
          <div>
            <SectionHeading title="Garden State Forum" href="/category/opinion" kicker="Opinion & op-eds" />
            <StoryCard story={opinion} size="large" />
          </div>
          <div className="lg:border-l lg:pl-8">
            <SectionHeading title="Local Essentials" />
            <ServiceLink icon={<MapPinned />} label="Your county" value="Middlesex · 25 municipalities" href="/category/middlesex" />
            <ServiceLink icon={<Landmark />} label="Statehouse to Main Street" value="What Trenton decisions mean here" href="/category/statehouse" />
            <ServiceLink icon={<ShieldCheck />} label="Courier Watch" value="Tips, records and accountability" href="/tips" />
          </div>
        </div>
      </section>

      <section className="border-t bg-brand-navy py-12 text-white sm:py-14">
        <div className="container-news grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="eyebrow text-brand-yellow">The Middlesex Morning</p>
            <h2 className="headline-balance mt-3 text-3xl font-black leading-none tracking-[-0.045em] sm:text-4xl">Useful local reporting before the day gets noisy.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">A concise weekday briefing. Breaking-news alerts stay separate, so readers control the volume.</p>
          </div>
          <div className="bg-white p-5 text-foreground sm:p-7"><NewsletterForm /></div>
        </div>
      </section>
    </>
  );
}

function CompactStory({ story, image = false }: { story: Story; image?: boolean }) {
  return (
    <article className="border-b py-5 last:border-b-0">
      {image ? <Link href={`/story/${story.slug}`} className="relative mb-4 block aspect-[16/9] overflow-hidden bg-muted"><Image src={story.image} alt={story.imageAlt} fill sizes="360px" className="object-cover" /></Link> : null}
      <p className="eyebrow text-brand-blue">{story.categoryLabel}</p>
      <h3 className="mt-1.5 text-xl font-black leading-[1.05] tracking-[-0.035em] text-brand-navy"><Link href={`/story/${story.slug}`} className="hover:underline">{story.headline}</Link></h3>
      <StoryMeta story={story} />
    </article>
  );
}

function StoryMeta({ story }: { story: Story }) {
  return <p className="mt-3 text-[0.68rem] font-semibold text-muted-foreground">{story.location} · {timeAgo(story.publishedAt)} · {story.readingMinutes} min read</p>;
}

function MustReadCard({ icon, title, copy, href }: { icon: React.ReactNode; title: string; copy: string; href: string }) {
  return (
    <Link href={href} className="group grid min-h-40 grid-cols-[2.75rem_1fr] gap-4 px-1 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
      <span className="grid size-11 place-items-center bg-brand-sky text-brand-blue [&_svg]:size-5">{icon}</span>
      <span><span className="block text-lg font-black tracking-[-0.025em] text-brand-navy group-hover:underline">{title}</span><span className="mt-2 block text-sm leading-6 text-muted-foreground">{copy}</span></span>
    </Link>
  );
}

function ServiceLink({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="group flex min-h-24 items-center gap-4 border-b py-5 last:border-b-0">
      <span className="grid size-10 shrink-0 place-items-center bg-brand-sky text-brand-blue [&_svg]:size-5">{icon}</span>
      <span><span className="block text-[0.64rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span><span className="mt-1 block text-sm font-bold text-brand-navy group-hover:underline">{value}</span></span>
    </Link>
  );
}
