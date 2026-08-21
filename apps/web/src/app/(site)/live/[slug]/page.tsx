import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CirclePause, MapPin, Radio, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { LiveCoverageTimeline } from "@/components/live-coverage-timeline";
import { SiteNotificationControl } from "@/components/site-notification-control";
import { getPublicLiveEvent } from "@/lib/live-coverage";
import { absoluteUrl, isSearchIndexingEnabled } from "@/lib/seo";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getResolvedSiteDesign } from "@/lib/site-design";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicLiveEvent(slug).catch(() => null);
  if (!event) return { title: "Live coverage unavailable", robots: { index: false, follow: false } };
  const index = isSearchIndexingEnabled() && event.status !== "scheduled";
  return {
    title: event.title,
    description: event.description ?? `Live reporting from The New Jersey Courier: ${event.title}`,
    alternates: { canonical: `/live/${event.slug}` },
    robots: { index, follow: index },
    openGraph: {
      type: "article",
      title: event.title,
      description: event.description ?? undefined,
      url: `/live/${event.slug}`,
      images: event.heroImageUrl ? [{ url: event.heroImageUrl, alt: event.heroImageAlt ?? event.title }] : undefined,
    },
  };
}

export default async function LiveCoveragePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, configuration] = await Promise.all([
    getPublicLiveEvent(slug).catch((error) => {
      console.error("Live coverage page lookup failed", { slug, error });
      return null;
    }),
    getSiteConfiguration(),
  ]);
  if (!event) notFound();
  const isActive = event.status === "live" || event.status === "paused";
  const design = await getResolvedSiteDesign(configuration);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LiveBlogPosting",
    "@id": `${absoluteUrl(`/live/${event.slug}`)}#live-blog`,
    url: absoluteUrl(`/live/${event.slug}`),
    headline: event.title,
    description: event.description,
    datePublished: event.startedAt ?? event.scheduledAt ?? event.updatedAt,
    dateModified: event.updatedAt,
    coverageStartTime: event.startedAt ?? event.scheduledAt ?? event.updatedAt,
    ...(event.endedAt ? { coverageEndTime: event.endedAt } : {}),
    publisher: {
      "@type": "NewsMediaOrganization",
      name: configuration.publication.name,
      url: absoluteUrl("/"),
    },
    liveBlogUpdate: event.updates.slice(-100).map((update) => ({
      "@type": "BlogPosting",
      "@id": `${absoluteUrl(`/live/${event.slug}`)}#update-${update.id}`,
      headline: update.headline ?? `${event.title} update`,
      articleBody: update.body,
      datePublished: update.publishedAt,
      dateModified: update.correctedAt ?? update.publishedAt,
      author: { "@type": "Person", name: update.author.name },
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <article className={design === "v2" ? "v2-live-detail" : undefined}>
        <header className="relative overflow-hidden bg-[#031724] text-white">
          {event.heroImageUrl ? (
            <div className="absolute inset-0 opacity-25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.heroImageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#031724] via-[#031724]/90 to-[#031724]/45" />
            </div>
          ) : null}
          <div className="container-news relative py-10 sm:py-16">
            <Link href="/live" className="inline-flex items-center gap-1.5 text-xs font-bold text-white/65 hover:text-white"><ArrowLeft className="size-3.5" /> All live desks</Link>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${event.status === "live" ? "bg-brand-red text-white" : event.status === "paused" ? "bg-amber-400 text-brand-navy" : "bg-white/10 text-white"}`}>
                {event.status === "live" ? <Radio className="size-3.5 animate-pulse" /> : event.status === "paused" ? <CirclePause className="size-3.5" /> : <CalendarClock className="size-3.5" />}
                {event.status === "live" ? "Live now" : event.status === "paused" ? "Coverage paused" : event.status === "scheduled" ? "Upcoming live desk" : "Coverage complete"}
              </span>
              {event.location ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60"><MapPin className="size-3.5" /> {event.location}</span> : null}
            </div>
            <h1 className="headline-balance mt-5 max-w-5xl text-4xl font-black leading-[0.96] tracking-[-0.06em] sm:text-6xl lg:text-7xl">{event.title}</h1>
            {event.description ? <p className="mt-6 max-w-3xl text-base leading-7 text-white/70 sm:text-xl sm:leading-8">{event.description}</p> : null}
            <div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-yellow" /> Verified Courier newsroom updates</span>
              <span>Last changed {formatHeaderDate(event.updatedAt, configuration.publication.timezone)}</span>
            </div>
          </div>
        </header>

        {isActive && event.streamUrl ? (
          <section className="bg-black">
            <div className="container-news py-5">
              <video className="mx-auto aspect-video max-h-[70vh] w-full bg-black" src={event.streamUrl} controls playsInline aria-label={`Live stream: ${event.title}`} />
            </div>
          </section>
        ) : null}

        <div className="container-news py-10 sm:py-14">
          <LiveCoverageTimeline initialEvent={event} />
        </div>

        {isActive && configuration.features.alerts ? (
          <div className="container-news pb-14"><SiteNotificationControl /></div>
        ) : null}
      </article>
    </>
  );
}

function formatHeaderDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
