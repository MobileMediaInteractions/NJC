"use client";

import Link from "next/link";
import {
  Bell,
  CloudSun,
  Menu,
  Play,
  Search,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="bg-white">
      <a
        href="#main-content"
        className="sr-only z-[100] bg-brand-yellow px-4 py-2 font-bold text-brand-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <div className="bg-brand-navy text-white">
        <div className="container-news flex h-9 items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Monday, July 13</span>
            <span className="hidden text-white/45 sm:inline">•</span>
            <span className="hidden text-white/70 sm:inline">
              Port Alder, ME
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link className="flex items-center gap-1.5 hover:text-brand-yellow" href="/weather">
              <CloudSun className="size-3.5" /> 72°
            </Link>
            <Link className="hidden items-center gap-1.5 hover:text-brand-yellow sm:flex" href="/newsletter">
              <Bell className="size-3.5" /> Get alerts
            </Link>
          </div>
        </div>
      </div>

      <div className="container-news flex h-[78px] items-center justify-between">
        <div className="flex items-center gap-2 lg:hidden">
          <MobileNavigation />
        </div>
        <BrandMark />
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" asChild aria-label="Search Harborline">
            <Link href="/search"><Search className="size-5" /></Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex" aria-label="Newsroom sign in">
            <Link href="/studio"><UserRound className="size-5" /></Link>
          </Button>
          <Button asChild className="ml-1 bg-brand-red text-white hover:bg-brand-red/90">
            <Link href="/live"><Play className="size-4 fill-current" /> Watch live</Link>
          </Button>
        </div>
      </div>

      <nav className="hidden border-y border-brand-navy/15 lg:block" aria-label="Primary navigation">
        <div className="container-news flex h-12 items-center gap-7">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.8rem] font-bold uppercase tracking-[0.075em] text-brand-navy transition-colors hover:text-brand-blue"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-4 border-l border-brand-navy/15 pl-6">
            <Link href="/about" className="text-xs font-semibold text-muted-foreground hover:text-brand-navy">About</Link>
            <Link href="/newsletter" className="text-xs font-semibold text-muted-foreground hover:text-brand-navy">Newsletters</Link>
          </div>
        </div>
      </nav>

      <div className="overflow-hidden border-b bg-brand-sky/60">
        <div className="container-news flex h-9 items-center gap-3 whitespace-nowrap text-xs">
          <span className="shrink-0 bg-brand-yellow px-2 py-1 text-[0.62rem] font-black uppercase tracking-widest text-brand-navy">
            Developing
          </span>
          <div className="min-w-0 overflow-hidden">
            <div className="ticker-track flex w-max items-center gap-16 font-medium text-brand-navy">
              <span>City releases $48M working-waterfront resilience plan</span>
              <span>Coastal storm watch begins Tuesday at 6 a.m.</span>
              <span>Harbor Hawks secure a home playoff series</span>
              <span aria-hidden="true">City releases $48M working-waterfront resilience plan</span>
              <span aria-hidden="true">Coastal storm watch begins Tuesday at 6 a.m.</span>
              <span aria-hidden="true">Harbor Hawks secure a home playoff series</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation">
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
              <Link href={item.href} className="border-b py-4 text-lg font-bold text-brand-navy">
                {item.label}
              </Link>
            </SheetClose>
          ))}
          <Separator className="my-5" />
          <SheetClose asChild><Link href="/newsletter" className="py-2 font-semibold">Newsletters & alerts</Link></SheetClose>
          <SheetClose asChild><Link href="/about" className="py-2 font-semibold">About Harborline</Link></SheetClose>
          <SheetClose asChild><Link href="/studio" className="py-2 font-semibold">Newsroom sign in</Link></SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
