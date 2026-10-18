import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { communityCategories } from "@/lib/community";
import { formatCommunityDate } from "@/lib/community-date-format";
import { communityBulletinPath, type PublicCommunityBulletin } from "@/lib/community-public-model";

export function CommunityBulletinCard({ bulletin, timezone }: { bulletin: PublicCommunityBulletin; timezone: string }) {
  const category = communityCategories.find(([value]) => value === bulletin.category)?.[1] ?? "Community";
  return (
    <Link href={communityBulletinPath(bulletin.slug)} className="group flex h-full min-w-0 flex-col rounded-2xl border border-[#b9ad8e]/50 bg-[#fbf8f0] p-6 text-[#20281f] shadow-sm transition hover:-translate-y-0.5 hover:border-[#9b6740] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9b6740] dark:border-white/15 dark:bg-[#1d2a22] dark:text-[#f2eee3] dark:hover:border-[#d19a60] dark:focus-visible:outline-[#d19a60]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[.68rem] font-bold uppercase tracking-[.14em] text-[#815333] dark:text-[#e0b477]">{category}</span>
        {bulletin.isFeatured ? <span className="rounded-full bg-[#e8ddc7] px-2 py-1 text-xs font-semibold text-[#6d4a32] dark:bg-[#3a3929] dark:text-[#e4b983]">Editor’s pick</span> : null}
      </div>
      <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight group-hover:underline">{bulletin.title}</h3>
      <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-[#5f655c] dark:text-[#b6c0b4]">{bulletin.description}</p>
      <div className="mt-auto space-y-2 pt-5 text-sm text-[#555d53] dark:text-[#c0c7bb]">
        {bulletin.startsAt ? <p className="flex items-start gap-2"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{formatCommunityDate(bulletin.startsAt, timezone)}</span></p> : null}
        {bulletin.city || bulletin.venue ? <p className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{[bulletin.venue, bulletin.city].filter(Boolean).join(" · ")}</span></p> : null}
        <span className="flex items-center gap-2 pt-3 font-semibold text-[#76503a] dark:text-[#e4b983]">Read the full bulletin <ArrowUpRight aria-hidden="true" className="size-4" /></span>
      </div>
    </Link>
  );
}
