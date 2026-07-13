import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Play, Radio, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeading } from "@/components/section-heading";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { getPublishedStories } from "@/lib/content";
import { seedStories, weatherSeed } from "@/lib/seed";

export default async function HomePage() {
  const published = await getPublishedStories({ limit: 12 });
  const stories = [
    ...published,
    ...seedStories.filter((seed) => !published.some((story) => story.slug === seed.slug)),
  ].slice(0, 12);
  const [lead, weather, investigation, ferry, sports, culture, education] = stories;

  return (
    <>
      <section className="container-news py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.82fr)] lg:gap-10">
          <StoryCard story={lead} size="large" />
          <div className="space-y-6 lg:border-l lg:pl-8">
            <div className="flex items-center justify-between border-b-2 border-brand-navy pb-3">
              <h2 className="text-sm font-black uppercase tracking-[0.13em] text-brand-navy">Right now</h2>
              <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-brand-red"><Radio className="size-3.5" /> Live desk</span>
            </div>
            <StoryCard story={weather} size="horizontal" />
            <StoryCard story={investigation} size="horizontal" />
            <StoryCard story={ferry} size="compact" className="border-b pb-5" />
            <Link href="/latest" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue hover:text-brand-navy">More latest news <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section className="border-y bg-white py-5">
        <div className="container-news grid gap-5 sm:grid-cols-3 sm:divide-x">
          <QuickFact icon={<Clock3 />} label="Morning brief" value="5 stories for your day" href="/newsletter" />
          <QuickFact icon={<MapPin />} label="Your community" value="Choose your town" href="/category/local" />
          <QuickFact icon={<ShieldCheck />} label="Harborline Investigates" value="Send a confidential tip" href="/tips" />
        </div>
      </section>

      <section className="container-news py-12">
        <AdSlot />
      </section>

      <section className="container-news pb-14">
        <SectionHeading title="Across Harbor County" href="/category/local" kicker="Local first" />
        <div className="grid gap-x-6 gap-y-9 md:grid-cols-2 lg:grid-cols-4">
          <StoryCard story={ferry} />
          <StoryCard story={education} />
          <StoryCard story={culture} />
          <StoryCard story={sports} />
        </div>
      </section>

      <section className="bg-brand-navy py-12 text-white">
        <div className="container-news grid items-center gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative aspect-video overflow-hidden bg-[#041e31]">
            <Image src={weather.image} alt={weather.imageAlt} fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/20 to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <Button asChild size="lg" className="rounded-full bg-white text-brand-navy hover:bg-white/90">
                <Link href="/live"><Play className="size-5 fill-current" /> Watch Harborline Now</Link>
              </Button>
            </div>
            <div className="absolute bottom-5 left-5">
              <p className="eyebrow text-brand-yellow">Streaming now</p>
              <p className="mt-1 text-2xl font-bold">Afternoon update from the waterfront</p>
            </div>
          </div>
          <div>
            <p className="eyebrow text-brand-yellow">Live · Weather desk</p>
            <h2 className="headline-balance mt-3 text-4xl font-black leading-none tracking-[-0.045em]">Know what’s next, down to your street.</h2>
            <p className="mt-5 text-base leading-7 text-white/68">Continuous local coverage, live council meetings, severe-weather cut-ins and original programs made in Port Alder.</p>
            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/15 pt-6">
              <div><p className="text-3xl font-black text-brand-yellow">{weatherSeed.temperature}°</p><p className="mt-1 text-xs text-white/60">{weatherSeed.condition}</p></div>
              <div><p className="text-3xl font-black text-brand-yellow">{weatherSeed.high}° / {weatherSeed.low}°</p><p className="mt-1 text-xs text-white/60">High / low</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-news py-14">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <SectionHeading title="Harborline Investigates" href="/category/investigates" />
            <StoryCard story={investigation} size="large" />
          </div>
          <div className="bg-brand-sky/65 p-7 lg:mt-0">
            <p className="eyebrow text-brand-blue">Public records desk</p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-brand-navy">We follow the paper trail so you don’t have to.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Explore documents, searchable databases and reporting methods behind our accountability work.</p>
            <Button variant="outline" asChild className="mt-6 border-brand-navy text-brand-navy"><Link href="/category/investigates">Open the investigations desk <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      <section className="container-news pb-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div><SectionHeading title="Local sports" href="/category/sports" /><StoryCard story={sports} size="large" /></div>
          <div><SectionHeading title="Things to do" href="/category/culture" /><StoryCard story={culture} size="large" /></div>
        </div>
      </section>

      <section className="bg-brand-blue py-12 text-white">
        <div className="container-news grid items-center gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow text-brand-yellow">The Daily Current</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.045em]">The local news you’ll use. One email.</h2>
            <p className="mt-3 max-w-xl text-white/70">A sharp five-minute briefing every weekday at 6:30 a.m., plus breaking-news and severe-weather alerts.</p>
          </div>
          <NewsletterForm inverse />
        </div>
      </section>
    </>
  );
}

function QuickFact({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 sm:px-5 first:pl-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-sky text-brand-blue [&_svg]:size-4">{icon}</span>
      <span><span className="block text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">{label}</span><span className="mt-0.5 block text-sm font-bold text-brand-navy group-hover:underline">{value}</span></span>
    </Link>
  );
}
