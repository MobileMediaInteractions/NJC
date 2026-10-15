import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ChevronDown } from "lucide-react";
import { PrivacyChoicesButton } from "@/components/cookie-consent";
import type { SiteConfiguration } from "@/lib/site-settings";
import { footerNavigation } from "@/lib/footer-navigation";
import { brandAssets } from "@/lib/assets";

export type SiteFooterProps = {
  publication: SiteConfiguration["publication"];
  features: SiteConfiguration["features"];
  staffPageEnabled?: boolean;
  easterEggEnabled?: boolean;
};

export function CompactSiteFooter({ publication, features, staffPageEnabled = false, easterEggEnabled = false }: SiteFooterProps) {
  const navigation = footerNavigation(features, staffPageEnabled);
  return <footer className="site-footer-compact">
    <div className="site-footer-compact__inner">
      <div className="site-footer-compact__top">
        <div className="site-footer-compact__identity">
          <Link href="/" className="site-footer-compact__brand" aria-label={`${publication.name} home`}><Image src={brandAssets.mark} width={30} height={30} alt="" /><span>{publication.shortName}</span></Link>
          <p>Independent journalism. Rooted in {publication.region}.</p>
        </div>
        <a href="#page-top" className="site-footer-compact__top-link">Back to top <ArrowUp aria-hidden="true" /></a>
      </div>
      <nav aria-label="Footer shortcuts" className="site-footer-compact__shortcuts">{navigation.primary.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <nav aria-label="Explore the Courier" className="site-footer-compact__groups">
        {navigation.groups.map((group) => <details key={group.title} name="footer-explore" className="site-footer-compact__group"><summary>{group.title}<ChevronDown aria-hidden="true" /></summary><ul>{group.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></details>)}
      </nav>
      <div className="site-footer-compact__legal">
        <p data-courier-frequency={easterEggEnabled ? "exit-9" : undefined}>© {new Date().getFullYear()} {publication.name}<span className="site-footer-compact__desk"> · {publication.station} · {publication.city}</span></p>
        <nav aria-label="Privacy and terms"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><PrivacyChoicesButton className="h-auto p-0 text-xs" /></nav>
      </div>
    </div>
  </footer>;
}
