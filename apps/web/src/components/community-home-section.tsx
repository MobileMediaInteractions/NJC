import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";
import { CommunityBulletinCard } from "@/components/community-bulletin-card";
import type { PublicCommunityBulletin } from "@/lib/community-public-model";

export function CommunityHomeSection({ bulletins, timezone, available }: { bulletins: PublicCommunityBulletin[]; timezone: string; available: boolean }) {
  return (
    <section aria-labelledby="home-community-title" className="border-y border-[#aa9a76]/40 bg-[#eee6d4] py-10 text-[#20281f] dark:border-white/10 dark:bg-[#17221c] dark:text-[#f2eee3] sm:py-14">
      <div className="container-news">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#815333] dark:text-[#e0b477]"><Sprout aria-hidden="true" className="size-4" /> Your neighborhood noticeboard</p><h2 id="home-community-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">In the Community</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#596056] dark:text-[#b9c2b6]">Local happenings, good works and ways to get involved. Reviewed by the Courier’s community desk.</p></div>
          <Link href="/community" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#9b6740]/50 px-5 text-sm font-semibold hover:underline dark:border-[#d19a60]/60">Explore the bulletin <ArrowRight aria-hidden="true" className="size-4" /></Link>
        </header>
        {bulletins.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{bulletins.map((bulletin) => <CommunityBulletinCard key={bulletin.id} bulletin={bulletin} timezone={timezone} />)}</div> : <p className="rounded-xl border border-dashed border-[#aa9a76]/60 p-6 text-sm dark:border-white/20">{available ? "New community listings will appear here after review." : "The bulletin is temporarily unavailable. Please check back shortly."}</p>}
        <p className="mt-6 text-sm text-[#596056] dark:text-[#b9c2b6]">Have something to share? <Link href="/community#submit-event" className="font-semibold underline underline-offset-4">Send a community update or event</Link>.</p>
      </div>
    </section>
  );
}
