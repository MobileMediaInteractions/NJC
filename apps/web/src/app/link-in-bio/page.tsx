import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, asc, eq, lte, gt, isNull, or } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Clock3, Newspaper } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { linkInBioEntries, stories } from "@harborline/backend/schema";
import { brandAssets } from "@/lib/assets";
import { normalizeSocialSource } from "@/lib/link-in-bio";
import { getSiteConfiguration } from "@/lib/site-settings";

const linksOrigin = process.env.NEXT_PUBLIC_LINKS_URL?.replace(/\/$/, "") ??
  "https://links.thejerseycourier.com";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Courier on Social",
  description: "The latest reporting shared by The New Jersey Courier.",
  alternates: { canonical: linksOrigin },
  robots: { index: false, follow: true },
  openGraph: {
    title: "The Courier on Social",
    description: "Open the latest reporting shared by The New Jersey Courier.",
    url: linksOrigin,
    type: "website",
  },
};

export default async function LinkInBioPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  await requireLinksHost();
  const configuration = await getSiteConfiguration();
  if (!configuration.features.linkInBio) redirect("https://www.thejerseycourier.com");
  const source = normalizeSocialSource((await searchParams).source);
  const now = new Date();
  const entries = hasDatabase()
    ? await getDb()
        .select({
          id: linkInBioEntries.id,
          slug: linkInBioEntries.slug,
          displayTitle: linkInBioEntries.displayTitle,
          headline: stories.headline,
          dek: stories.dek,
          categoryLabel: stories.categoryLabel,
          imageUrl: stories.imageUrl,
          imageAlt: stories.imageAlt,
          readingMinutes: stories.readingMinutes,
          publishedAt: stories.publishedAt,
        })
        .from(linkInBioEntries)
        .innerJoin(stories, eq(linkInBioEntries.storyId, stories.id))
        .where(
          and(
            eq(linkInBioEntries.isVisible, true),
            eq(stories.status, "published"),
            lte(stories.publishedAt, now),
            or(isNull(linkInBioEntries.startsAt), lte(linkInBioEntries.startsAt, now)),
            or(isNull(linkInBioEntries.endsAt), gt(linkInBioEntries.endsAt, now)),
          ),
        )
        .orderBy(asc(linkInBioEntries.sortOrder), asc(linkInBioEntries.createdAt))
        .limit(50)
    : [];

  return (
    <main className="min-h-dvh bg-[#f5f2ea] px-4 py-8 text-[#102219] dark:bg-[#07150f] dark:text-[#f6f2e8] sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <header className="text-center">
          <Link
            href="https://www.thejerseycourier.com"
            className="inline-flex items-center gap-3 rounded-full border border-[#15392d]/15 bg-white/75 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
          >
            <Image src={brandAssets.mark} alt="" width={42} height={42} priority />
            <span className="text-left">
              <strong className="block text-sm font-black uppercase tracking-tight">The New Jersey Courier</strong>
              <small className="block text-[0.62rem] font-bold uppercase tracking-[0.2em] opacity-55">Middlesex County</small>
            </span>
          </Link>
          <p className="mt-8 text-[0.66rem] font-black uppercase tracking-[0.24em] text-[#9b6c25] dark:text-[#dfac58]">From our social desk</p>
          <h1 className="mx-auto mt-3 max-w-xl font-serif text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl">The stories we’re sharing now.</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 opacity-65 sm:text-base">Independent local reporting from Middlesex County and across New Jersey. Tap a story to read it on The Courier.</p>
        </header>

        <section className="mt-10 space-y-4" aria-label="Shared Courier stories">
          {entries.length ? entries.map((entry, index) => (
            <Link
              key={entry.id}
              href={`/${entry.slug}?source=${source}`}
              className="group grid overflow-hidden rounded-2xl border border-[#15392d]/15 bg-white shadow-[0_18px_50px_rgba(16,34,25,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[#c7933e]/60 hover:shadow-[0_22px_60px_rgba(16,34,25,0.14)] dark:border-white/10 dark:bg-[#102219] sm:grid-cols-[11rem_1fr]"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-[#d8d4ca] sm:aspect-auto sm:min-h-40 dark:bg-[#183126]">
                {entry.imageUrl ? (
                  <Image
                    src={entry.imageUrl}
                    alt={entry.imageAlt ?? ""}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 640px) 100vw, 176px"
                    className="object-cover transition duration-300 group-hover:scale-[1.025]"
                  />
                ) : (
                  <div className="grid h-full min-h-36 place-items-center"><Newspaper className="size-8 opacity-25" /></div>
                )}
              </div>
              <article className="flex min-w-0 flex-col justify-between gap-4 p-5">
                <div>
                  <p className="text-[0.63rem] font-black uppercase tracking-[0.18em] text-[#9b6c25] dark:text-[#dfac58]">{entry.categoryLabel}</p>
                  <h2 className="mt-2 text-balance font-serif text-xl font-black leading-tight sm:text-2xl">{entry.displayTitle || entry.headline}</h2>
                  {entry.dek ? <p className="mt-2 line-clamp-2 text-sm leading-5 opacity-60">{entry.dek}</p> : null}
                </div>
                <div className="flex items-center justify-between gap-4 text-xs font-semibold opacity-55">
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> {entry.readingMinutes} min read</span>
                  <span className="inline-flex items-center gap-1 text-[#9b6c25] opacity-100 dark:text-[#dfac58]">Read story <ArrowUpRight className="size-3.5" /></span>
                </div>
              </article>
            </Link>
          )) : (
            <div className="rounded-2xl border border-dashed border-[#15392d]/25 p-8 text-center dark:border-white/15">
              <Newspaper className="mx-auto size-8 opacity-30" />
              <h2 className="mt-4 font-serif text-2xl font-black">More reporting is on the way.</h2>
              <p className="mt-2 text-sm opacity-60">Visit the front page for the latest local news.</p>
              <Link href="https://www.thejerseycourier.com" className="mt-5 inline-flex rounded-full bg-[#173e31] px-5 py-3 text-sm font-bold text-white">Open The Courier</Link>
            </div>
          )}
        </section>

        <footer className="mt-10 flex flex-col items-center gap-3 text-center text-xs opacity-55">
          <p>The authoritative voice of the Garden State.</p>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Courier links">
            <Link href="https://www.thejerseycourier.com/latest">Latest</Link>
            <Link href="https://www.thejerseycourier.com/about">About</Link>
            <Link href="https://www.thejerseycourier.com/tips">Send a tip</Link>
            <Link href="https://www.thejerseycourier.com/privacy">Privacy</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}

async function requireLinksHost() {
  const hostname = (await headers()).get("host")?.split(":", 1)[0]?.toLowerCase();
  if (
    hostname !== "links.thejerseycourier.com" &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  ) {
    notFound();
  }
}
