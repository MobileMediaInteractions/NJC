"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CloudSun,
  Home,
  MapPin,
  Menu,
  MessageSquareText,
  Newspaper,
  Search,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PwaInstallButton } from "@/components/pwa/public-pwa-shell";
import { ThemeMenu } from "@/components/theme-menu";
import { SiteHeaderV2 } from "@/components/site-v2/site-header-v2";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  hasStudioAccessRole,
  resolveSiteAccountAction,
  type SiteAccountAction,
} from "@/lib/site-account";
import type { SiteConfiguration } from "@/lib/site-settings";
import type { LiveCoverageEvent, Story, WeatherSnapshot } from "@harborline/contracts";
import type { PublicSiteDesign } from "@/lib/site-design";

type SiteHeaderProps = {
  publication: SiteConfiguration["publication"];
  navigation: SiteConfiguration["navigation"];
  features: SiteConfiguration["features"];
  plusEnabled?: boolean;
  clerkEnabled: boolean;
  studioHref: string;
  design?: PublicSiteDesign;
  v2TranslucentHeader?: boolean;
};

export function SiteHeader(props: SiteHeaderProps) {
  if (props.clerkEnabled) {
    return <AuthenticatedSiteHeader {...props} />;
  }

  return (
    <SiteHeaderContent
      {...props}
      accountAction={resolveSiteAccountAction({
        signedIn: false,
        hasStudioAccess: false,
      })}
    />
  );
}

function AuthenticatedSiteHeader(props: SiteHeaderProps) {
  const { isSignedIn, user } = useUser();
  const accountAction = resolveSiteAccountAction(
    {
      signedIn: isSignedIn === true,
      hasStudioAccess: hasStudioAccessRole(user?.publicMetadata.role),
    },
    props.studioHref,
  );

  return <SiteHeaderContent {...props} accountAction={accountAction} />;
}

function SiteHeaderContent({ publication, navigation, features, accountAction, plusEnabled = false, design = "legacy", v2TranslucentHeader = true }: SiteHeaderProps & { accountAction: SiteAccountAction }) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [latestStory, setLatestStory] = useState<Story | null>(null);
  const [liveEvent, setLiveEvent] = useState<LiveCoverageEvent | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      features.weather ? fetch("/api/v1/weather").then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return (await response.json() as { data: WeatherSnapshot }).data;
      }) : Promise.resolve(null),
      fetch("/api/v1/stories?limit=1").then(async (response) => {
        if (!response.ok) throw new Error("Stories unavailable");
        return (await response.json() as { data: Story[] }).data[0] ?? null;
      }),
      fetch("/api/v1/live/coverage?limit=3").then(async (response) => {
        if (!response.ok) throw new Error("Live coverage unavailable");
        const events = (await response.json() as { data: LiveCoverageEvent[] }).data;
        return events.find((event) => event.status === "live" || event.status === "paused") ?? null;
      }),
    ]).then(([weatherResult, storyResult, liveResult]) => {
      if (!active) return;
      if (weatherResult.status === "fulfilled") setWeather(weatherResult.value);
      if (storyResult.status === "fulfilled") setLatestStory(storyResult.value);
      if (liveResult.status === "fulfilled") setLiveEvent(liveResult.value);
    });
    return () => { active = false; };
  }, [features.weather]);

  if (design === "v2") {
    return (
      <SiteHeaderV2
        publication={publication}
        navigation={navigation}
        features={features}
        accountAction={accountAction}
        plusEnabled={plusEnabled}
        weather={weather}
        liveEvent={liveEvent}
        latestStory={latestStory}
        translucent={v2TranslucentHeader}
      />
    );
  }

  return (
    <>
      <header className="mobile-native-header sticky top-0 z-40 bg-card text-card-foreground lg:static">
      <a
        href="#main-content"
        className="sr-only z-[100] bg-brand-yellow px-4 py-2 font-bold text-brand-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div className="container-news hidden h-[92px] grid-cols-[1fr_auto_1fr] items-center gap-8 lg:grid">
        <Link href="/category/middlesex" className="group justify-self-start">
          <span className="block text-[0.64rem] font-black uppercase tracking-[0.16em] text-brand-blue">
            Your edition
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-brand-navy group-hover:underline">
            <MapPin className="size-3.5" /> {publication.region}
          </span>
        </Link>

        <Masthead publication={publication} />

        <div className="flex items-center justify-self-end gap-2">
          {features.newsletters ? <Button variant="outline" size="sm" asChild className="rounded-none border-brand-navy text-xs font-bold">
            <Link href="/newsletter"><Bell /> Get the briefing</Link>
          </Button> : null}
          <Button size="sm" asChild className="rounded-none bg-brand-blue text-xs font-bold text-white hover:bg-brand-navy">
            <Link href={accountAction.href}>{accountAction.label}</Link>
          </Button>
        </div>
      </div>

      <div className="container-news grid h-[68px] grid-cols-[2.75rem_1fr_2.75rem] items-center lg:hidden">
        <MobileNavigation publication={publication} navigation={navigation} features={features} accountAction={accountAction} plusEnabled={plusEnabled} />
        <Link href="/" className="min-w-0 text-center" aria-label={`${publication.name} home`}>
          <span className="font-editorial block truncate text-[1.45rem] font-semibold leading-none tracking-[-0.045em] text-brand-navy sm:text-[1.7rem]">
            {publication.name}
          </span>
          <span className="mt-1.5 block text-[0.46rem] font-black uppercase tracking-[0.2em] text-brand-blue">
            {publication.region}
          </span>
        </Link>
        <Link href="/search" className="grid size-11 place-items-center justify-self-end" aria-label="Search">
          <Search className="size-5" />
        </Link>
      </div>

      <nav className="hidden bg-brand-navy text-white lg:block" aria-label="Primary navigation">
        <div className="container-news flex h-11 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:gap-7">
          <div className="hidden h-full items-center gap-5 lg:flex lg:gap-7">
            {navigation.map((item, index) => (
              <Link key={item.href} href={item.href} className={`${index > 3 ? "hidden xl:inline" : ""} shrink-0 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow`}>
                {item.label}
              </Link>
            ))}
            {plusEnabled ? <Link href="/plus" className="shrink-0 text-[0.69rem] font-black uppercase tracking-[0.065em] text-[#b9ff4a] hover:text-white">NJC+</Link> : null}
          </div>
          <div className="flex h-full shrink-0 items-center gap-5 lg:ml-auto">
            <Link href="/search" className="hidden items-center gap-1.5 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow lg:flex">
              <Search className="size-3.5" /> Search
            </Link>
            {features.weather ? <Link href="/weather" className="flex shrink-0 items-center gap-1.5 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow">
              <CloudSun className="size-3.5" /> {weather ? `${weather.temperature}° ${weather.location.split(",")[0]}` : "Local weather"}
            </Link> : null}
            <span className="hidden h-4 w-px bg-white/20 lg:block" />
            <ThemeMenu />
            <Link href={accountAction.href} className="hidden shrink-0 items-center gap-1.5 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow lg:flex">
              <UserRound className="size-3.5" /> {accountAction.label}
            </Link>
          </div>
        </div>
      </nav>

      {liveEvent || latestStory ? <div className={`border-b ${liveEvent ? "bg-brand-red text-white" : "bg-secondary/75"}`}>
        <div className="container-news flex min-h-9 items-center gap-3 overflow-hidden text-[0.72rem]">
          <span className={`shrink-0 font-black uppercase tracking-[0.12em] ${liveEvent ? "text-white" : "text-brand-red"}`}>{liveEvent ? "Live" : "Latest"}</span>
          <span className={`h-3.5 w-px shrink-0 ${liveEvent ? "bg-white/35" : "bg-border"}`} />
          <Link href={liveEvent ? `/live/${liveEvent.slug}` : `/story/${latestStory!.slug}`} className="truncate font-semibold hover:underline">
            {liveEvent?.title ?? latestStory!.headline}
          </Link>
          <Link href={liveEvent ? `/live/${liveEvent.slug}` : "/latest"} className={`ml-auto hidden shrink-0 font-semibold hover:underline md:block ${liveEvent ? "text-white" : "text-brand-blue"}`}>
            {liveEvent ? "Follow updates" : "All local coverage"}
          </Link>
        </div>
      </div> : null}

      </header>
      <MobileAppDock
        accountAction={accountAction}
        weatherEnabled={features.weather}
      />
    </>
  );
}

function Masthead({ publication }: { publication: SiteConfiguration["publication"] }) {
  return (
    <Link href="/" className="text-center" aria-label={`${publication.name} home`}>
      <span className="font-editorial block text-[3.05rem] font-semibold leading-[0.8] tracking-[-0.065em] text-brand-navy">
        {publication.name}
      </span>
      <span className="mt-3 block text-[0.54rem] font-black uppercase tracking-[0.265em] text-brand-blue">
        {publication.tagline}
      </span>
    </Link>
  );
}

function MobileNavigation({ publication, navigation, features, accountAction, plusEnabled = false }: { publication: SiteConfiguration["publication"]; navigation: SiteConfiguration["navigation"]; features: SiteConfiguration["features"]; accountAction: SiteAccountAction; plusEnabled?: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation" className="-ml-2 size-11">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 overflow-y-auto p-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="bg-brand-navy px-6 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-left">
          <SheetTitle><BrandMark inverse publication={publication} /></SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-6 py-5" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link href={item.href} className="border-b py-3.5 text-base font-bold text-brand-navy">{item.label}</Link>
            </SheetClose>
          ))}
          {plusEnabled ? <SheetClose asChild><Link href="/plus" className="border-b py-3.5 text-base font-black text-[#669900]">NJC+</Link></SheetClose> : null}
          <Separator className="my-5" />
          <SheetClose asChild><Link href="/search" className="flex items-center gap-2 py-2 font-semibold"><Search className="size-4" />Search the Courier</Link></SheetClose>
          {features.weather ? <SheetClose asChild><Link href="/weather" className="flex items-center gap-2 py-2 font-semibold"><CloudSun className="size-4" />Local weather</Link></SheetClose> : null}
          {features.newsletters ? <SheetClose asChild><Link href="/newsletter" className="flex items-center gap-2 py-2 font-semibold"><Bell className="size-4" />Newsletters & alerts</Link></SheetClose> : null}
          <SheetClose asChild><Link href={accountAction.href} className="flex items-center gap-2 py-2 font-semibold"><UserRound className="size-4" />{accountAction.label}</Link></SheetClose>
          <div className="mt-5"><PwaInstallButton /></div>
          <div className="mt-5 border-t pt-4"><ThemeMenu /></div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileAppDock({
  accountAction,
  weatherEnabled,
}: {
  accountAction: SiteAccountAction;
  weatherEnabled: boolean;
}) {
  const pathname = usePathname();
  const destinations = [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    {
      href: "/latest",
      label: "Latest",
      icon: Newspaper,
      active: pathname === "/latest" || pathname.startsWith("/story/"),
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      active: pathname === "/search",
    },
    weatherEnabled
      ? {
          href: "/weather",
          label: "Weather",
          icon: CloudSun,
          active: pathname === "/weather",
        }
      : {
          href: "/tips",
          label: "Tip line",
          icon: MessageSquareText,
          active: pathname === "/tips",
        },
    {
      href: accountAction.href,
      label: accountAction.label,
      icon: UserRound,
      active:
        pathname === "/profile" ||
        pathname.startsWith("/studio") ||
        pathname.startsWith("/sign-in"),
    },
  ];

  return (
    <nav className="mobile-app-dock lg:hidden" aria-label="Mobile app navigation">
      <div className="grid grid-cols-5">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          return (
            <Link
              key={destination.href}
              href={destination.href}
              aria-current={destination.active ? "page" : undefined}
              className="group flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[0.62rem] font-bold text-muted-foreground"
            >
              <span className="grid h-7 min-w-11 place-items-center rounded-full px-3 transition-colors group-aria-[current=page]:bg-brand-sky group-aria-[current=page]:text-brand-navy dark:group-aria-[current=page]:bg-white/15 dark:group-aria-[current=page]:text-white">
                <Icon className="size-5" strokeWidth={destination.active ? 2.5 : 2} />
              </span>
              <span className="max-w-full truncate group-aria-[current=page]:text-brand-navy dark:group-aria-[current=page]:text-white">
                {destination.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
