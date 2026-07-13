import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  MapPin,
  Play,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { Story } from "@/lib/types";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeading } from "@/components/section-heading";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { getPublishedStories } from "@/lib/content";
import { seedStories, weatherSeed } from "@/lib/seed";
import { timeAgo } from "@/lib/format";

export default async function HomePage() {
  const published = await getPublishedStories({ limit: 12 });
  const stories = [
    ...published,
    ...seedStories.filter(
      (seed) => !published.some((story) => story.slug === seed.slug),
    ),
  ].slice(0, 12);
  const [lead, weather, investigation, ferry, sports, culture, education] =
    stories;

  return (
    <>
      <section className="container-news py-7 sm:py-9">
        <div className="mb-5 flex items-center justify-between border-b pb-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <span>Monday edition</span>
          <span className="hidden sm:inline">The coast, clearly reported.</span>
          <Link href="/latest" className="text-brand-blue hover:underline">
            View all latest
          </Link>
        </div>

        <div className="grid gap-7 xl:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.5fr)_minmax(15rem,0.68fr)] xl:gap-8">
          <div className="order-2 flex flex-col justify-center xl:order-1 xl:border-r xl:pr-8">
            <StoryLabel story={lead} />
            <h1 className="font-editorial headline-balance mt-3 text-[2.45rem] font-semibold leading-[0.98] tracking-[-0.045em] text-brand-navy sm:text-5xl xl:text-[3.25rem]">
              <Link
                href={`/story/${lead.slug}`}
                className="hover:text-brand-blue"
              >
                {lead.headline}
              </Link>
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              {lead.dek}
            </p>
            <p className="mt-5 border-t pt-4 text-[0.7rem] font-semibold text-muted-foreground">
              {lead.location} · {timeAgo(lead.publishedAt)} ·{" "}
              {lead.readingMinutes} min read
            </p>
          </div>

          <Link
            href={`/story/${lead.slug}`}
            className="relative order-1 block aspect-[16/10] overflow-hidden bg-muted xl:order-2 xl:aspect-auto xl:min-h-[32rem]"
          >
            <Image
              src={lead.image}
              alt={lead.imageAlt}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 48vw"
              className="object-cover transition-transform duration-700 hover:scale-[1.015]"
            />
          </Link>

          <aside
            className="order-3 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
            aria-labelledby="briefing-heading"
          >
            <div className="flex items-center justify-between border-b-2 border-brand-navy pb-3">
              <h2
                id="briefing-heading"
                className="font-editorial text-xl font-semibold text-brand-navy"
              >
                Today in Harbor County
              </h2>
              <Radio className="size-4 text-brand-red" />
            </div>
            <BriefingStory story={weather} />
            <BriefingStory story={investigation} />
            <BriefingStory story={ferry} last />
          </aside>
        </div>

        <div className="mt-8 grid gap-6 border-y py-6 md:grid-cols-3 md:divide-x">
          <RailStory story={education} />
          <RailStory story={sports} className="md:pl-6" />
          <RailStory story={culture} className="md:pl-6" />
        </div>
      </section>

      <section className="border-b bg-secondary/55">
        <div className="container-news grid gap-0 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ServiceLink
            icon={<CloudSun />}
            label="Weather center"
            value={`${weatherSeed.temperature}° · ${weatherSeed.condition}`}
            href="/weather"
          />
          <ServiceLink
            icon={<MapPin />}
            label="Your community"
            value="Choose your Harbor County town"
            href="/category/local"
          />
          <ServiceLink
            icon={<ShieldCheck />}
            label="Secure news tips"
            value="Reach the investigations desk"
            href="/tips"
          />
        </div>
      </section>

      <section className="container-news py-14 sm:py-18">
        <SectionHeading
          title="The County Edition"
          href="/category/local"
          kicker="Reporting close to home"
        />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
          <StoryCard story={investigation} size="large" />
          <div className="grid content-start gap-7 lg:border-l lg:pl-8">
            <StoryCard story={ferry} size="horizontal" />
            <StoryCard story={education} size="horizontal" />
            <Link
              href="/category/local"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-blue hover:underline"
            >
              More from across the county <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy py-12 text-white sm:py-16">
        <div className="container-news grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
          <div className="relative aspect-video overflow-hidden bg-[#041e31]">
            <Image
              src={weather.image}
              alt={weather.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 62vw"
              className="object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/10 to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-brand-navy hover:bg-white/90"
              >
                <Link href="/live">
                  <Play className="size-5 fill-current" /> Watch Harborline Now
                </Link>
              </Button>
            </div>
          </div>
          <div>
            <p className="eyebrow text-brand-yellow">Live newsroom</p>
            <h2 className="font-editorial headline-balance mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              When the story changes, we’re already here.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
              Council meetings, breaking weather and original local
              programs—reported and produced in Port Alder.
            </p>
            <div className="mt-7 flex gap-8 border-t border-white/15 pt-6">
              <div>
                <p className="text-3xl font-black text-brand-yellow">
                  {weatherSeed.temperature}°
                </p>
                <p className="mt-1 text-xs text-white/60">Right now</p>
              </div>
              <div>
                <p className="text-3xl font-black text-brand-yellow">
                  {weatherSeed.high}° / {weatherSeed.low}°
                </p>
                <p className="mt-1 text-xs text-white/60">High / low</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-news py-14 sm:py-18">
        <SectionHeading title="More to Know" href="/latest" />
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
          <StoryCard story={sports} />
          <StoryCard story={culture} />
          <StoryCard story={weather} />
        </div>
      </section>

      <section className="border-y bg-card py-14 sm:py-16">
        <div className="container-news grid gap-9 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center">
          <div>
            <p className="eyebrow text-brand-blue">The Daily Current</p>
            <h2 className="font-editorial mt-3 text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-navy sm:text-5xl">
              Five useful stories. One calm morning read.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
              The local reporting you need every weekday at 6:30 a.m., with
              separate breaking-news and severe-weather alerts.
            </p>
          </div>
          <div className="rounded-sm bg-brand-blue p-6 text-white sm:p-8">
            <NewsletterForm inverse />
          </div>
        </div>
      </section>
    </>
  );
}

function StoryLabel({ story }: { story: Story }) {
  return (
    <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.15em]">
      {story.isBreaking ? (
        <span className="text-brand-red">Breaking</span>
      ) : null}
      <span className="text-brand-blue">{story.categoryLabel}</span>
    </div>
  );
}

function BriefingStory({
  story,
  last = false,
}: {
  story: Story;
  last?: boolean;
}) {
  return (
    <article className={last ? "pt-5" : "border-b py-5"}>
      <StoryLabel story={story} />
      <h3 className="font-editorial mt-2 text-[1.38rem] font-semibold leading-[1.08] tracking-[-0.025em] text-brand-navy">
        <Link href={`/story/${story.slug}`} className="hover:text-brand-blue">
          {story.headline}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
        {story.dek}
      </p>
    </article>
  );
}

function RailStory({
  story,
  className = "",
}: {
  story: Story;
  className?: string;
}) {
  return (
    <article className={className}>
      <StoryLabel story={story} />
      <h3 className="font-editorial mt-2 text-2xl font-semibold leading-[1.05] tracking-[-0.03em] text-brand-navy">
        <Link href={`/story/${story.slug}`} className="hover:text-brand-blue">
          {story.headline}
        </Link>
      </h3>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {story.readingMinutes} min read
      </p>
    </article>
  );
}

function ServiceLink({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-24 items-center gap-4 px-5 py-5 first:pl-0 last:pr-0"
    >
      <span className="grid size-10 shrink-0 place-items-center text-brand-blue [&_svg]:size-5">
        {icon}
      </span>
      <span>
        <span className="block text-[0.64rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block text-sm font-bold text-brand-navy group-hover:underline">
          {value}
        </span>
      </span>
    </Link>
  );
}
