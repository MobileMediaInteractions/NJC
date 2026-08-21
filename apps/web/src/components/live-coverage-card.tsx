import Link from "next/link";
import { ArrowRight, CalendarClock, CirclePause, Radio, TimerReset } from "lucide-react";
import type { LiveCoverageEvent } from "@harborline/contracts";

export function LiveCoverageCard({ event, featured = false }: { event: LiveCoverageEvent; featured?: boolean }) {
  const isActive = event.status === "live" || event.status === "paused";
  return (
    <article className={`${featured ? "bg-brand-navy text-white" : "border bg-card"} relative overflow-hidden`}>
      {event.heroImageUrl ? (
        <div className={`absolute inset-0 ${featured ? "opacity-20" : "opacity-[0.08]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.heroImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className={`relative ${featured ? "p-7 sm:p-9" : "p-5 sm:p-6"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] ${featured ? "text-brand-yellow" : "text-brand-red"}`}>
            {event.status === "live" ? <Radio className="size-3.5 animate-pulse" /> : event.status === "paused" ? <CirclePause className="size-3.5" /> : event.status === "scheduled" ? <CalendarClock className="size-3.5" /> : <TimerReset className="size-3.5" />}
            {event.status === "live" ? "Live now" : event.status === "paused" ? "Live desk paused" : event.status === "scheduled" ? "Upcoming" : "Coverage complete"}
          </span>
          <span className={`text-xs ${featured ? "text-white/55" : "text-muted-foreground"}`}>{event.updateCount} update{event.updateCount === 1 ? "" : "s"}</span>
        </div>
        <h2 className={`${featured ? "mt-4 max-w-4xl text-3xl text-white sm:text-5xl" : "mt-3 text-2xl text-brand-navy dark:text-foreground"} font-black leading-[1.02] tracking-[-0.05em]`}>
          <Link href={`/live/${event.slug}`} className="hover:underline">{event.title}</Link>
        </h2>
        {event.description ? <p className={`${featured ? "max-w-3xl text-white/70" : "text-muted-foreground"} mt-4 line-clamp-3 text-sm leading-6 sm:text-base`}>{event.description}</p> : null}
        <div className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium ${featured ? "text-white/55" : "text-muted-foreground"}`}>
          {event.location ? <span>{event.location}</span> : null}
          {event.latestUpdateAt ? <span>Updated {formatLiveDate(event.latestUpdateAt)}</span> : event.scheduledAt ? <span>Starts {formatLiveDate(event.scheduledAt)}</span> : null}
          <Link href={`/live/${event.slug}`} className={`inline-flex items-center gap-1 font-black ${featured ? "text-brand-yellow" : "text-brand-blue"}`}>{isActive ? "Follow live" : "Open timeline"}<ArrowRight className="size-3.5" /></Link>
        </div>
      </div>
    </article>
  );
}

function formatLiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
