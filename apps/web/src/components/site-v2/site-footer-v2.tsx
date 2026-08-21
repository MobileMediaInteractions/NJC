import Link from "next/link";
import { PrivacyChoicesButton } from "@/components/cookie-consent";
import type { SiteConfiguration } from "@/lib/site-settings";

export function SiteFooterV2({ publication, features, staffPageEnabled = false }: {
  publication: SiteConfiguration["publication"];
  features: SiteConfiguration["features"];
  staffPageEnabled?: boolean;
}) {
  return (
    <footer className="v2-footer">
      <div className="v2-footer__grid">
        <div className="v2-footer__identity">
          <p className="v2-footer__wordmark"><span>NJC</span>{publication.shortName}</p>
          <p>Independent, county-first reporting for {publication.region}, designed to make the important things unmistakable.</p>
          <p className="v2-footer__desk">{publication.station} · {publication.city}</p>
        </div>
        <FooterColumn title="News" links={[["Today", "/"], ["Latest", "/latest"], ["Middlesex", "/category/middlesex"], ["Statehouse", "/category/statehouse"], ["Sports", "/category/sports"]]} />
        <FooterColumn title="Participate" links={[["20 Under 20", "/20-under-20"], ["Weekly Pulse", "/category/public-square"], ["Submit a tip", "/tips"], ...(features.newsletters ? [["Newsletters", "/newsletter"]] : [])]} />
        <FooterColumn title="About" links={[["Our journalism", "/standards"], ...(staffPageEnabled ? [["Our staff", "/staff"]] : []), ["About", "/about"], ["Press", "/press"], ["Accessibility", "/accessibility"], ["Legal", "/legal"]]} />
      </div>
      <div className="v2-footer__legal">
        <p>© 2026 {publication.name}</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><PrivacyChoicesButton className="h-auto p-0 text-xs" /></div>
        <p>{publication.tagline}</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return <div className="v2-footer__column"><h2>{title}</h2><ul>{links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></div>;
}
