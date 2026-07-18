"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  CloudSun,
  MapPin,
  Menu,
  Search,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeMenu } from "@/components/theme-menu";
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
import { siteConfig } from "@/lib/site";
import type { Story, WeatherSnapshot } from "@harborline/contracts";

export function SiteHeader() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [latestStory, setLatestStory] = useState<Story | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      fetch("/api/v1/weather").then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return (await response.json() as { data: WeatherSnapshot }).data;
      }),
      fetch("/api/v1/stories?limit=1").then(async (response) => {
        if (!response.ok) throw new Error("Stories unavailable");
        return (await response.json() as { data: Story[] }).data[0] ?? null;
      }),
    ]).then(([weatherResult, storyResult]) => {
      if (!active) return;
      if (weatherResult.status === "fulfilled") setWeather(weatherResult.value);
      if (storyResult.status === "fulfilled") setLatestStory(storyResult.value);
    });
    return () => { active = false; };
  }, []);

  return (
    <header className="bg-card text-card-foreground">
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
            <MapPin className="size-3.5" /> Middlesex County
          </span>
        </Link>

        <Masthead />

        <div className="flex items-center justify-self-end gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-none border-brand-navy text-xs font-bold">
            <Link href="/newsletter"><Bell /> Get the briefing</Link>
          </Button>
          <Button size="sm" asChild className="rounded-none bg-brand-blue text-xs font-bold text-white hover:bg-brand-navy">
            <Link href="/studio">Sign in</Link>
          </Button>
        </div>
      </div>

      <div className="container-news grid h-[68px] grid-cols-[2.75rem_1fr_2.75rem] items-center lg:hidden">
        <MobileNavigation />
        <Link href="/" className="min-w-0 text-center" aria-label="The New Jersey Courier home">
          <span className="font-editorial block truncate text-[1.45rem] font-semibold leading-none tracking-[-0.045em] text-brand-navy sm:text-[1.7rem]">
            The New Jersey Courier
          </span>
          <span className="mt-1.5 block text-[0.46rem] font-black uppercase tracking-[0.2em] text-brand-blue">
            Middlesex County
          </span>
        </Link>
        <Link href="/search" className="grid size-10 place-items-center justify-self-end" aria-label="Search">
          <Search className="size-5" />
        </Link>
      </div>

      <nav className="bg-brand-navy text-white" aria-label="Primary navigation">
        <div className="container-news flex h-11 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:gap-7">
          <div className="hidden h-full items-center gap-5 lg:flex lg:gap-7">
            {siteConfig.navigation.map((item, index) => (
              <Link key={item.href} href={item.href} className={`${index > 3 ? "hidden xl:inline" : ""} shrink-0 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow`}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex h-full shrink-0 items-center gap-5 lg:ml-auto">
            <Link href="/search" className="hidden items-center gap-1.5 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow lg:flex">
              <Search className="size-3.5" /> Search
            </Link>
            <Link href="/weather" className="flex shrink-0 items-center gap-1.5 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow">
              <CloudSun className="size-3.5" /> {weather ? `${weather.temperature}° ${weather.location.split(",")[0]}` : "Local weather"}
            </Link>
            <span className="hidden h-4 w-px bg-white/20 lg:block" />
            <ThemeMenu />
            <Link href="/studio" className="hidden shrink-0 items-center gap-1.5 text-[0.69rem] font-bold uppercase tracking-[0.065em] text-white/90 hover:text-brand-yellow lg:flex">
              <UserRound className="size-3.5" /> Sign in
            </Link>
          </div>
        </div>
      </nav>

      {latestStory ? <div className="border-b bg-secondary/75">
        <div className="container-news flex min-h-9 items-center gap-3 overflow-hidden text-[0.72rem]">
          <span className="shrink-0 font-black uppercase tracking-[0.12em] text-brand-red">Latest</span>
          <span className="h-3.5 w-px shrink-0 bg-border" />
          <Link href={`/story/${latestStory.slug}`} className="truncate font-semibold hover:underline">
            {latestStory.headline}
          </Link>
          <Link href="/latest" className="ml-auto hidden shrink-0 font-semibold text-brand-blue hover:underline md:block">
            All local coverage
          </Link>
        </div>
      </div> : null}
    </header>
  );
}

function Masthead() {
  return (
    <Link href="/" className="text-center" aria-label="The New Jersey Courier home">
      <span className="font-editorial block text-[3.05rem] font-semibold leading-[0.8] tracking-[-0.065em] text-brand-navy">
        The New Jersey Courier
      </span>
      <span className="mt-3 block text-[0.54rem] font-black uppercase tracking-[0.265em] text-brand-blue">
        The Authoritative Voice of the Garden State
      </span>
    </Link>
  );
}

function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation" className="-ml-2">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
        <SheetHeader className="bg-brand-navy px-6 py-6 text-left">
          <SheetTitle><BrandMark inverse /></SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-6 py-5" aria-label="Mobile navigation">
          {siteConfig.navigation.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link href={item.href} className="border-b py-3.5 text-base font-bold text-brand-navy">{item.label}</Link>
            </SheetClose>
          ))}
          <Separator className="my-5" />
          <SheetClose asChild><Link href="/search" className="flex items-center gap-2 py-2 font-semibold"><Search className="size-4" />Search the Courier</Link></SheetClose>
          <SheetClose asChild><Link href="/weather" className="flex items-center gap-2 py-2 font-semibold"><CloudSun className="size-4" />Local weather</Link></SheetClose>
          <SheetClose asChild><Link href="/newsletter" className="flex items-center gap-2 py-2 font-semibold"><Bell className="size-4" />Newsletters & alerts</Link></SheetClose>
          <SheetClose asChild><Link href="/studio" className="flex items-center gap-2 py-2 font-semibold"><UserRound className="size-4" />Newsroom sign in</Link></SheetClose>
          <div className="mt-5 border-t pt-4"><ThemeMenu /></div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
