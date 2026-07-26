import Image from "next/image";
import Link from "next/link";
import { CircleUserRound, Headphones, Radio, Search, Tv } from "lucide-react";
import { getNjcPlusFlags } from "@/lib/feature-flags";
import { getActiveBetaTesterGrant } from "@/lib/njc-plus-beta";
import { njcPlusAssets } from "@/lib/njc-plus-assets";
import { getSiteOrigin } from "@/lib/origin";

export function NjcPlusLogo({ compact = false }: { compact?: boolean }) {
  return <Image src={compact ? njcPlusAssets.icon : njcPlusAssets.primaryDark} width={compact ? 44 : 176} height={compact ? 44 : 50} alt="NJC+" priority className={compact ? "size-11" : "h-10 w-auto sm:h-12"} />;
}

export async function NjcPlusHeader({ studioPreview = false }: { studioPreview?: boolean }) {
  const [storedFlags, betaGrant] = await Promise.all([
    getNjcPlusFlags(),
    studioPreview ? Promise.resolve(null) : getActiveBetaTesterGrant(),
  ]);
  const flags = new Map(storedFlags.map((flag) => [flag.key, flag.effective]));
  const visible = (key: string) =>
    studioPreview || flags.get(key as never) === true || betaGrant?.featureKeys.includes(key) === true;
  const siteOrigin = getSiteOrigin();
  return (
    <>
      {studioPreview ? <div className="plus-preview-bar">Studio preview · NJC+ is not public</div> : null}
      <header className="plus-header">
        <div className="plus-shell plus-header-inner">
          <Link href={studioPreview ? "/plus?preview=studio" : "/plus"} aria-label="NJC+ home"><NjcPlusLogo /></Link>
          <nav aria-label="NJC+ primary">
            {visible("njc_plus_video") ? <Link href={studioPreview ? "/plus/watch?preview=studio" : "/plus/watch"}><Tv /> Watch</Link> : null}
            {visible("njc_plus_audio") || visible("njc_plus_podcasts") ? <Link href={studioPreview ? "/plus/listen?preview=studio" : "/plus/listen"}><Headphones /> Listen</Link> : null}
            {visible("njc_plus_live") ? <Link href={studioPreview ? "/plus/live?preview=studio" : "/plus/live"}><Radio /> Live</Link> : null}
            {visible("njc_plus_search") ? <Link href={studioPreview ? "/plus/search?preview=studio" : "/plus/search"}><Search /> Search</Link> : null}
          </nav>
          <Link href={`${siteOrigin}/sign-in`} className="plus-account"><CircleUserRound /><span>Account</span></Link>
        </div>
      </header>
    </>
  );
}

export function NjcPlusFooter() {
  const siteOrigin = getSiteOrigin();
  return <footer className="plus-footer"><div className="plus-shell"><NjcPlusLogo /><p>Independent premium reporting, films, shows and sound from The New Jersey Courier.</p><div><Link href={`${siteOrigin}/terms`}>Terms</Link><Link href={`${siteOrigin}/privacy`}>Privacy</Link><Link href={`${siteOrigin}/accessibility`}>Accessibility</Link><Link href={siteOrigin}>The Courier</Link></div><small>© {new Date().getFullYear()} The New Jersey Courier. NJC+ is an original product.</small></div></footer>;
}
