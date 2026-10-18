import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, MoveUpRight, Sprout, Users } from "lucide-react";
import { communityCategories } from "@/lib/community";
import { formatCommunityDate } from "@/lib/community-date-format";
import { safeCommunityExternalUrl, type PublicCommunityBulletin } from "@/lib/community-public-model";

function BulletinText({ text }: { text: string }) {
  return text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="whitespace-pre-line break-words">{paragraph.split(/(https:\/\/[^\s<>]+)/g).map((part, partIndex) => {
    if (!part.startsWith("https://")) return part;
    const url = safeCommunityExternalUrl(part);
    return url ? <a key={partIndex} href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-[#9b6740]/60 underline-offset-4 hover:decoration-current dark:decoration-[#d19a60]/70">{part}</a> : part;
  })}</p>);
}

export function CommunityBulletinDetail({ bulletin, timezone, now = new Date() }: { bulletin: PublicCommunityBulletin; timezone: string; now?: Date }) {
  const category = communityCategories.find(([value]) => value === bulletin.category)?.[1] ?? "Community";
  const externalUrl = safeCommunityExternalUrl(bulletin.externalUrl);
  const eventHasPassed = bulletin.startsAt && (bulletin.endsAt ?? bulletin.startsAt).getTime() < now.getTime();
  return (
    <div className="min-h-screen bg-[#f5f0e5] text-[#20281f] dark:bg-[#17221c] dark:text-[#f2eee3]">
      <header className="border-b border-[#aa9a76]/40 bg-[#e7ddc5] dark:border-white/10 dark:bg-[#223329]">
        <div className="container-news py-8 sm:py-12">
          <Link href="/community" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:underline"><ArrowLeft aria-hidden="true" className="size-4" /> Back to the community bulletin</Link>
          <p className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#815333] dark:text-[#e0b477]"><Sprout aria-hidden="true" className="size-4" /> In the Community · {category}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-5xl lg:text-6xl">{bulletin.title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#596056] dark:text-[#b9c2b6]">A community bulletin reviewed by the Courier. {bulletin.publishedAt ? <>Published <time dateTime={bulletin.publishedAt.toISOString()}>{formatCommunityDate(bulletin.publishedAt, timezone)}</time>.</> : null}</p>
        </div>
      </header>
      <div className="container-news grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 sm:py-14">
        <article aria-label="Full community bulletin" className="min-w-0">
          <div className="space-y-6 text-lg leading-8 text-[#424c40] dark:text-[#d0d8cb]"><BulletinText text={bulletin.description} /></div>
          <div className="mt-10 border-t border-[#aa9a76]/40 pt-6 text-sm leading-6 text-[#62675e] dark:border-white/15 dark:text-[#aeb8ac]"><strong>About this notice</strong><p className="mt-2">This is a community listing, not a reported news article. Details may be supplied by organizers and can change. Confirm arrangements directly before attending or participating. Inclusion does not imply Courier endorsement.</p></div>
        </article>
        <aside aria-label="Community details" className="min-w-0 self-start rounded-2xl border border-[#b9ad8e]/50 bg-[#fbf8f0] p-6 dark:border-white/15 dark:bg-[#1d2a22]">
          <h2 className="text-xl font-semibold">{bulletin.startsAt ? "Plan your visit" : "Around the neighborhood"}</h2>
          {eventHasPassed ? <p className="mt-4 rounded-lg bg-[#e8ddc7] p-3 text-sm text-[#6d4a32] dark:bg-[#3a3929] dark:text-[#e4b983]">This event’s listed date has passed. This bulletin is retained for reference.</p> : null}
          <dl className="mt-5 space-y-5 text-sm">
            {bulletin.startsAt ? <div><dt className="flex items-center gap-2 font-semibold"><CalendarDays aria-hidden="true" className="size-4" /> When</dt><dd className="mt-2 leading-6"><time dateTime={bulletin.startsAt.toISOString()}>{formatCommunityDate(bulletin.startsAt, timezone)}</time>{bulletin.endsAt ? <> – <time dateTime={bulletin.endsAt.toISOString()}>{formatCommunityDate(bulletin.endsAt, timezone)}</time></> : null}<span className="block text-xs text-[#62675e] dark:text-[#aeb8ac]">{timezone.replaceAll("_", " ")}</span></dd></div> : null}
            {bulletin.venue || bulletin.city ? <div><dt className="flex items-center gap-2 font-semibold"><MapPin aria-hidden="true" className="size-4" /> Where</dt><dd className="mt-2 leading-6">{[bulletin.venue, bulletin.city].filter(Boolean).join(" · ")}</dd></div> : null}
            {bulletin.organizer ? <div><dt className="flex items-center gap-2 font-semibold"><Users aria-hidden="true" className="size-4" /> Organizer</dt><dd className="mt-2 leading-6">{bulletin.organizer}</dd></div> : null}
          </dl>
          {externalUrl ? <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7b4a32] px-4 py-3 text-sm font-semibold text-[#fff9ed] hover:bg-[#633b29] dark:bg-[#d19a60] dark:text-[#1c261f]">{bulletin.startsAt ? "Organizer details / RSVP" : "Learn more from the organizer"}<MoveUpRight aria-hidden="true" className="size-4 shrink-0" /></a> : null}
          <Link href="/community#submit-event" className="mt-6 block text-sm font-semibold underline underline-offset-4">Share your own community update</Link>
        </aside>
      </div>
    </div>
  );
}
