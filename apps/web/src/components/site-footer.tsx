import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-brand-navy text-white">
      <div className="container-news grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <BrandMark inverse />
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/67">
            Independent reporting for the people and places of {siteConfig.region}. Local ownership. Public-service journalism. No national filler.
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-yellow">
            {siteConfig.station} · Port Alder
          </p>
        </div>
        <FooterGroup title="News" links={[
          ["Latest", "/latest"], ["Local", "/category/local"], ["Weather", "/weather"], ["Sports", "/category/sports"], ["Investigates", "/category/investigates"],
        ]} />
        <FooterGroup title="Connect" links={[
          ["Watch live", "/live"], ["Newsletters", "/newsletter"], ["Submit a tip", "/tips"], ["Developers", "/developers"], ["Newsroom login", "/studio"],
        ]} />
        <FooterGroup title="Harborline" links={[
          ["About us", "/about"], ["Our standards", "/standards"], ["Accessibility", "/accessibility"], ["Legal center", "/legal"], ["Privacy choices", "/data-requests"],
        ]} />
      </div>
      <div className="border-t border-white/12">
        <div className="container-news flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Harborline Local Media. Fictional demonstration identity. <Link className="underline hover:text-white" href="/privacy">Privacy</Link> · <Link className="underline hover:text-white" href="/terms">Terms</Link></p>
          <p>The coast, clearly reported.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-brand-yellow">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="text-sm text-white/72 hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
