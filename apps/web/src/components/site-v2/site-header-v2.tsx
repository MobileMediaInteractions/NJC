"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  CloudSun,
  Menu,
  Search,
  UserRound,
} from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/public-pwa-shell";
import { SearchOverlayV2 } from "@/components/site-v2/search-overlay-v2";
import { ThemeMenu } from "@/components/theme-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SiteAccountAction } from "@/lib/site-account";
import type { SiteConfiguration } from "@/lib/site-settings";
import type { LiveCoverageEvent, Story, WeatherSnapshot } from "@harborline/contracts";

export function SiteHeaderV2({
  publication,
  navigation,
  features,
  accountAction,
  plusEnabled,
  weather,
  liveEvent,
  latestStory,
  translucent,
}: {
  publication: SiteConfiguration["publication"];
  navigation: SiteConfiguration["navigation"];
  features: SiteConfiguration["features"];
  accountAction: SiteAccountAction;
  plusEnabled: boolean;
  weather: WeatherSnapshot | null;
  liveEvent: LiveCoverageEvent | null;
  latestStory: Story | null;
  translucent: boolean;
}) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const breakingStory = latestStory?.isBreaking ? latestStory : null;

  useEffect(() => {
    let animationFrame = 0;

    function updateHeaderMaterial() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY >= 40);
      });
    }

    updateHeaderMaterial();
    window.addEventListener("scroll", updateHeaderMaterial, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateHeaderMaterial);
    };
  }, []);

  return (
    <header className={`v2-global-header ${translucent ? "v2-global-header--material" : ""} ${isScrolled ? "is-scrolled" : ""}`}>
      <a href="#main-content" className="v2-skip-link">Skip to content</a>
      <div className="v2-global-row">
        <Link href="/" className="v2-wordmark" aria-label={`${publication.name} home`}>
          <span aria-hidden="true" className="v2-wordmark-mark">NJC</span>
          <span>{publication.shortName}</span>
        </Link>

        <nav className="v2-global-tools" aria-label="Reader tools">
          <SearchOverlayV2 />
          <Link href="/saved" className="v2-icon-link v2-desktop-tool" aria-label="Saved stories" aria-current={isActiveDestination(pathname, "/saved") ? "page" : undefined}><Bookmark /></Link>
          {features.newsletters ? <Link href="/newsletter" className="v2-icon-link v2-desktop-tool" aria-label="Newsletters" aria-current={isActiveDestination(pathname, "/newsletter") ? "page" : undefined}><Bell /></Link> : null}
          <ThemeMenu />
          <Link href={accountAction.href} className="v2-account-link" aria-current={isActiveDestination(pathname, accountAction.href) ? "page" : undefined}><UserRound /><span>{accountAction.label}</span></Link>
          <MobileMenu publication={publication} navigation={navigation} features={features} plusEnabled={plusEnabled} accountAction={accountAction} />
        </nav>
      </div>

      <nav className="v2-section-nav" aria-label="Primary navigation">
        <div className="v2-section-nav__track">
          <Link href="/" className={pathname === "/" ? "is-active" : undefined} aria-current={pathname === "/" ? "page" : undefined}>Today</Link>
          {navigation.map((item) => {
            const active = isActiveDestination(pathname, item.href);
            return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
          })}
          {plusEnabled ? <Link href="/plus" className={`v2-plus-link ${isActiveDestination(pathname, "/plus") ? "is-active" : ""}`} aria-current={isActiveDestination(pathname, "/plus") ? "page" : undefined}>NJC+</Link> : null}
          {features.weather ? <Link href="/weather" className={`v2-weather-link ${isActiveDestination(pathname, "/weather") ? "is-active" : ""}`} aria-current={isActiveDestination(pathname, "/weather") ? "page" : undefined}><CloudSun />{weather ? `${weather.temperature}° ${weather.location.split(",")[0]}` : "Weather"}</Link> : null}
        </div>
      </nav>

      {liveEvent || breakingStory ? (
        <div className={`v2-news-flash ${liveEvent ? "v2-news-flash--live" : "v2-news-flash--breaking"}`}>
          <div className="v2-news-flash__inner">
            <span className="v2-news-flash__label">{liveEvent ? <><i aria-hidden="true" /> Live</> : "Breaking"}</span>
            <Link href={liveEvent ? `/live/${liveEvent.slug}` : `/story/${breakingStory!.slug}`}>
              {liveEvent?.title ?? breakingStory!.headline}
            </Link>
            <Link className="v2-news-flash__action" href={liveEvent ? `/live/${liveEvent.slug}` : `/story/${breakingStory!.slug}`}>
              {liveEvent ? "Follow live" : "Read now"} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileMenu({ publication, navigation, features, plusEnabled, accountAction }: {
  publication: SiteConfiguration["publication"];
  navigation: SiteConfiguration["navigation"];
  features: SiteConfiguration["features"];
  plusEnabled: boolean;
  accountAction: SiteAccountAction;
}) {
  const pathname = usePathname();
  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className="v2-menu-trigger" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
      <SheetContent side="right" className="v2-mobile-menu w-full max-w-md p-0">
        <SheetHeader className="v2-mobile-menu__header"><SheetTitle>{publication.shortName}</SheetTitle></SheetHeader>
        <nav aria-label="Mobile navigation" className="v2-mobile-menu__nav">
          <SheetClose asChild><Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Today</Link></SheetClose>
          <SheetClose asChild><Link href="/latest" aria-current={isActiveDestination(pathname, "/latest") ? "page" : undefined}>Latest</Link></SheetClose>
          {navigation.filter((item) => item.href !== "/" && item.href !== "/latest").map((item) => <SheetClose asChild key={item.href}><Link href={item.href} aria-current={isActiveDestination(pathname, item.href) ? "page" : undefined}>{item.label}</Link></SheetClose>)}
          {plusEnabled ? <SheetClose asChild><Link href="/plus" aria-current={isActiveDestination(pathname, "/plus") ? "page" : undefined}>NJC+</Link></SheetClose> : null}
          <div className="v2-mobile-menu__utility">
            <SheetClose asChild><Link href="/search" aria-current={isActiveDestination(pathname, "/search") ? "page" : undefined}><Search /> Search</Link></SheetClose>
            <SheetClose asChild><Link href="/saved" aria-current={isActiveDestination(pathname, "/saved") ? "page" : undefined}><Bookmark /> Saved</Link></SheetClose>
            {features.newsletters ? <SheetClose asChild><Link href="/newsletter" aria-current={isActiveDestination(pathname, "/newsletter") ? "page" : undefined}><Bell /> Newsletters</Link></SheetClose> : null}
            <SheetClose asChild><Link href={accountAction.href} aria-current={isActiveDestination(pathname, accountAction.href) ? "page" : undefined}><UserRound /> {accountAction.label}</Link></SheetClose>
            <div className="v2-mobile-menu__appearance"><span>Appearance</span><ThemeMenu /></div>
            <PwaInstallButton />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function isActiveDestination(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
