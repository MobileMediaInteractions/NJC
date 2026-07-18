import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Landmark, Mail, MapPinned, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeading } from "@/components/section-heading";
import { StoryCard } from "@/components/story-card";
import { getPublishedStories } from "@/lib/content";
import { timeAgo } from "@/lib/format";
import { homePageJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import type { Story } from "@/lib/types";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stories = await getPublishedStories({ limit: 24 });
  const [lead, ...latest] = stories;
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: siteConfig.timezone,
  }).format(new Date());

  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <div className="container-news py-4 sm:py-6"><AdSlot size="leaderboard" /></div>

      <section className="container-news border-t-4 border-brand-navy pb-10 pt-3 sm:pb-14">
        <div className="mb-5 flex items-center justify-between gap-5">
          <div>
            <p className="eyebrow text-brand-blue">{date}</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-brand-navy sm:text-3xl">Top Stories</h1>
          </div>
          <Link href="/latest" className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-blue hover:underline">
            All news <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {lead ? (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.7fr)] lg:gap-9">
            <article className="border-b pb-7 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-9">
              <Link href={`/story/${lead.slug}`} className="group relative block aspect-[16/9] overflow-hidden bg-muted">
                <Image src={lead.image} alt={lead.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 70vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
              </Link>
              <p className="eyebrow mt-4 text-brand-blue">{lead.categoryLabel}</p>
              <h2 className="headline-balance mt-2 max-w-4xl text-[2.2rem] font-black leading-[0.97] tracking-[-0.055em] text-brand-navy sm:text-[3.2rem] lg:text-[3.65rem]">
                <Link href={`/story/${lead.slug}`} className="hover:underline">{lead.headline}</Link>
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{lead.dek}</p>
              <StoryMeta story={lead} />
            </article>
            <aside aria-labelledby="latest-briefing">
              <h2 id="latest-briefing" className="border-b-2 border-brand-navy pb-2 text-sm font-black uppercase tracking-[0.11em] text-brand-navy">Latest from the newsroom</h2>
              {latest.slice(0, 4).map((story, index) => <CompactStory key={story.id} story={story} image={index === 0} />)}
            </aside>
          </div>
        ) : (
          <EmptyNewsroom />
        )}
      </section>

      {latest.length > 0 ? (
        <section className="container-news py-12 sm:py-16">
          <SectionHeading title="Latest Reporting" href="/latest" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {latest.slice(0, 8).map((story) => <StoryCard key={story.id} story={story} />)}
          </div>
        </section>
      ) : null}

      <section className="border-y bg-card py-10">
        <div className="container-news grid gap-6 md:grid-cols-3 md:divide-x">
          <ServiceLink icon={<MapPinned />} label="County desk" value="Middlesex County reporting" href="/category/middlesex" />
          <ServiceLink icon={<Landmark />} label="Statehouse to Main Street" value="What Trenton decisions mean here" href="/category/statehouse" />
          <ServiceLink icon={<ShieldCheck />} label="Courier Watch" value="Send tips, records and accountability leads" href="/tips" />
        </div>
      </section>

      <section className="border-t bg-brand-navy py-12 text-white sm:py-14">
        <div className="container-news grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="eyebrow text-brand-yellow"><Mail className="mr-2 inline size-3.5" />The Middlesex Morning</p>
            <h2 className="headline-balance mt-3 text-3xl font-black leading-none tracking-[-0.045em] sm:text-4xl">Useful local reporting before the day gets noisy.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">A concise weekday briefing. Breaking-news alerts stay separate, so readers control the volume.</p>
          </div>
          <div className="bg-white p-5 text-foreground sm:p-7"><NewsletterForm /></div>
        </div>
      </section>
    </>
  );
}

function EmptyNewsroom() {
  return (
    <div className="grid min-h-80 place-items-center border-y bg-card px-6 py-16 text-center">
      <div className="max-w-xl">
        <p className="eyebrow text-brand-blue">Newsroom ready</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-brand-navy">The first verified story will appear here.</h2>
        <p className="mt-4 leading-7 text-muted-foreground">No sample articles are shown. Authorized newsroom staff can publish reporting through Studio NJ Dev.</p>
        <Link href="/studio" className="mt-6 inline-flex items-center gap-2 bg-brand-navy px-5 py-3 text-sm font-bold text-white">Open Studio <ArrowRight className="size-4" /></Link>
      </div>
    </div>
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

function ServiceLink({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="group flex min-h-24 items-center gap-4 px-2 py-5 md:px-6 md:first:pl-0">
      <span className="grid size-10 shrink-0 place-items-center bg-brand-sky text-brand-blue [&_svg]:size-5">{icon}</span>
      <span><span className="block text-[0.64rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span><span className="mt-1 block text-sm font-bold text-brand-navy group-hover:underline">{value}</span></span>
    </Link>
  );
}
