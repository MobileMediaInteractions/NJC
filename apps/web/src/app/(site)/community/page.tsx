import type { Metadata } from "next";
import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import { CalendarDays, MapPin, MoveUpRight, Sprout } from "lucide-react";
import { notFound } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityBulletins } from "@harborline/backend/schema";
import { CommunityEventForm } from "@/components/community-event-form";
import { getSiteConfiguration } from "@/lib/site-settings";
import { communityCategories } from "@/lib/community";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "In the Community | The New Jersey Courier",
  description: "Find local events, gatherings, volunteer opportunities and community notices across Middlesex County.",
  alternates: { canonical: "/community" },
};
export const dynamic = "force-dynamic";

export default async function InTheCommunityPage() {
  const configuration = await getSiteConfiguration();
  if (!configuration.features.community) notFound();

  let events: Array<typeof communityBulletins.$inferSelect> = [];
  let connected = hasDatabase();
  if (connected) {
    try {
      events = await getDb()
        .select()
        .from(communityBulletins)
        .where(and(
          eq(communityBulletins.status, "published"),
          or(
            isNull(communityBulletins.startsAt),
            gte(communityBulletins.startsAt, new Date()),
            gte(communityBulletins.endsAt, new Date()),
          ),
        ))
        .orderBy(asc(communityBulletins.startsAt), asc(communityBulletins.publishedAt))
        .limit(36);
    } catch (error) {
      console.error("Community bulletin lookup failed", error);
      connected = false;
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0e5] text-[#20281f] dark:bg-[#17221c] dark:text-[#f2eee3]">
      <section className="relative isolate overflow-hidden border-b border-[#988353]/25 bg-[#e7ddc5] dark:bg-[#223329]">
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-50 [background:radial-gradient(ellipse_at_15%_20%,rgba(184,102,55,.18),transparent_45%),radial-gradient(ellipse_at_90%_80%,rgba(72,102,72,.18),transparent_45%)]" />
        <div className="container-news grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-[#815333] dark:text-[#e0b477]"><Sprout className="size-4" /> Middlesex County · Community desk</p>
            <h1 className="mt-5 font-editorial text-5xl font-semibold leading-[.98] tracking-[-.05em] sm:text-7xl">In the<br className="hidden sm:block" /> Community</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4f564c] dark:text-[#c0c7bb]">A neighborhood bulletin for the gatherings, good works, local traditions and public events that make this place home.</p>
          </div>
          <a href="#submit-event" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7b4a32] px-6 text-sm font-semibold text-[#fff9ed] transition hover:bg-[#633b29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b4a32] dark:bg-[#d19a60] dark:text-[#1c261f]">Share a community event <MoveUpRight className="size-4" /></a>
        </div>
      </section>

      <section className="container-news py-12 sm:py-16" aria-labelledby="bulletin-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#988353]/35 pb-5">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#815333] dark:text-[#e0b477]">The local bulletin</p><h2 id="bulletin-title" className="mt-2 font-editorial text-3xl font-semibold tracking-tight sm:text-4xl">Around our community</h2></div>
          <p className="max-w-md text-sm leading-6 text-[#62675e] dark:text-[#aeb8ac]">Community-submitted listings are reviewed by Courier staff before anything appears here.</p>
        </div>
        {events.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const category = communityCategories.find(([value]) => value === event.category)?.[1] ?? "Community";
              return <article key={event.id} className={`flex min-h-72 flex-col rounded-2xl border border-[#b9ad8e]/50 bg-[#fbf8f0] p-6 shadow-[0_12px_35px_rgba(60,48,30,.06)] dark:border-white/10 dark:bg-[#1d2a22] ${event.isFeatured ? "ring-1 ring-[#bb7d4e]/60" : ""}`}>
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e8ddc7] px-3 py-1 text-[.68rem] font-bold uppercase tracking-[.14em] text-[#6d4a32] dark:bg-[#3a3929] dark:text-[#e4b983]">{category}</span>{event.isFeatured ? <span className="text-xs font-bold text-[#825235] dark:text-[#e4b983]">Editor’s pick</span> : null}</div>
                <h3 className="mt-5 font-editorial text-2xl font-semibold leading-tight">{event.title}</h3>
                {event.description ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#5f655c] dark:text-[#b6c0b4]">{event.description}</p> : null}
                <div className="mt-auto space-y-2 pt-5 text-sm text-[#555d53] dark:text-[#c0c7bb]">
                  {event.startsAt ? <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-[#9b6740]" />{formatEventDate(event.startsAt, configuration.publication.timezone)}</p> : null}
                  {event.venue || event.city ? <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-[#9b6740]" />{[event.venue, event.city].filter(Boolean).join(" · ")}</p> : null}
                  {event.externalUrl ? <a href={event.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-[#76503a] underline underline-offset-4 dark:text-[#e4b983]">Event details / RSVP <MoveUpRight className="size-3.5" /></a> : null}
                  {event.organizer ? <p className="pt-1 text-xs text-[#797e74] dark:text-[#9ba69a]">Organized by {event.organizer}</p> : null}
                </div>
              </article>;
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#aa9a76]/60 bg-[#eee6d4]/50 px-6 py-14 text-center dark:border-white/15 dark:bg-white/[.025]">
            <CalendarDays className="mx-auto size-8 text-[#9b6740] dark:text-[#d19a60]" />
            <h3 className="mt-4 font-editorial text-2xl font-semibold">{connected ? "The bulletin is waiting for its first listing" : "The bulletin is temporarily unavailable"}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#62675e] dark:text-[#aeb8ac]">{connected ? "There are no public events posted right now. Know of something neighbors should hear about? Send it to the community desk for review." : "Please check back shortly. No sample or unverified events are shown here."}</p>
          </div>
        )}
      </section>

      <section id="submit-event" className="border-y border-[#aa9a76]/40 bg-[#e9dfca] py-12 dark:bg-[#202e25] sm:py-16">
        <div className="container-news grid gap-9 lg:grid-cols-[.8fr_1.2fr]">
          <div className="max-w-md"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#815333] dark:text-[#e0b477]">Reader bulletin submissions</p><h2 className="mt-3 font-editorial text-3xl font-semibold leading-tight sm:text-4xl">Something good is happening nearby?</h2><p className="mt-4 text-sm leading-7 text-[#596056] dark:text-[#b9c2b6]">Send the details to our community desk. Our editors review every listing and may follow up before approving it for publication.</p><p className="mt-4 text-xs leading-5 text-[#77796e] dark:text-[#9fa99d]">Listings are subject to verification, available space and editorial judgment. Do not submit private or sensitive information.</p></div>
          <div className="rounded-2xl border border-[#aa9a76]/50 bg-[#fbf8f0] p-5 shadow-sm dark:border-white/10 dark:bg-[#18251d] sm:p-8"><CommunityEventForm /></div>
        </div>
      </section>
      <p className="container-news py-6 text-center text-xs text-[#77796e] dark:text-[#9fa99d]">A community noticeboard from {siteConfig.shortName}. Inclusion does not imply Courier endorsement.</p>
    </div>
  );
}

function formatEventDate(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone }).format(value);
}
