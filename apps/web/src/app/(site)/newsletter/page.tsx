import type { Metadata } from "next";
import { BellRing, CalendarDays, CloudLightning, MailOpen } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";

export const metadata: Metadata = { title: "Newsletters & alerts" };

export default function NewsletterPage() {
  return (
    <div className="container-news py-12">
      <div className="mx-auto max-w-4xl text-center"><p className="eyebrow text-brand-blue">Stay informed</p><h1 className="headline-balance mt-3 text-5xl font-black tracking-[-0.055em] text-brand-navy sm:text-6xl">Local news that meets you where you are.</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Choose a useful briefing—not another noisy inbox. Every Harborline email is written and edited in Port Alder.</p></div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        <NewsletterOption icon={<MailOpen />} title="The Daily Current" schedule="Weekdays · 6:30 a.m." copy="Five essential stories, a sharp weather look and one thing worth knowing." />
        <NewsletterOption icon={<CloudLightning />} title="Weather Alerts" schedule="As conditions warrant" copy="Severe-weather warnings and clear, neighborhood-level impact guidance." />
        <NewsletterOption icon={<CalendarDays />} title="The Weekend" schedule="Thursdays · 4 p.m." copy="The best local events, food, arts and outdoor plans for the days ahead." />
      </div>
      <section className="mx-auto mt-10 max-w-2xl border-t-4 border-brand-yellow bg-brand-navy p-8 text-white"><div className="flex items-center gap-3"><BellRing className="size-6 text-brand-yellow" /><h2 className="text-2xl font-black">Start with The Daily Current</h2></div><p className="mb-5 mt-3 text-sm text-white/65">You can manage every subscription from one click in any email.</p><NewsletterForm inverse /></section>
    </div>
  );
}

function NewsletterOption({ icon, title, schedule, copy }: { icon: React.ReactNode; title: string; schedule: string; copy: string }) {
  return <article className="border bg-card p-6"><div className="text-brand-blue [&_svg]:size-7">{icon}</div><h2 className="mt-5 text-2xl font-black text-brand-navy">{title}</h2><p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand-blue">{schedule}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{copy}</p></article>;
}
