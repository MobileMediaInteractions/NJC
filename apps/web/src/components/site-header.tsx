"use client";

import Link from "next/link";
import { Bell, CloudSun, Menu, Play, Search, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
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
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-t-[3px] border-brand-navy bg-card text-card-foreground">
      <a
        href="#main-content"
        className="sr-only z-[100] bg-brand-yellow px-4 py-2 font-bold text-brand-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div className="container-news hidden min-h-10 grid-cols-[1fr_auto_1fr] items-center border-b text-[0.7rem] text-muted-foreground lg:grid">
        <p>
          <strong className="text-foreground">Monday, July 13, 2026</strong>
          <span className="mx-2 text-border">|</span>Port Alder, Maine
        </p>
        <p className="font-semibold uppercase tracking-[0.16em]">
          Independent reporting for Harbor County
        </p>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
            <Link href="/search">
              <Search /> Search
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
            <Link href="/newsletter">
              <Bell /> Alerts
            </Link>
          </Button>
          <ThemeMenu />
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
            <Link href="/studio">
              <UserRound /> Sign in
            </Link>
          </Button>
        </div>
      </div>

      <div className="container-news hidden min-h-28 grid-cols-[1fr_auto_1fr] items-center lg:grid">
        <Link
          href="/weather"
          className="flex items-center gap-3 justify-self-start"
        >
          <CloudSun className="size-7 text-brand-blue" />
          <span>
            <span className="block text-sm font-bold">72° · Partly cloudy</span>
            <span className="block text-xs text-muted-foreground">
              Port Alder forecast
            </span>
          </span>
        </Link>
        <Masthead />
        <div className="flex items-center gap-3 justify-self-end">
          <p className="max-w-36 text-right text-xs leading-5 text-muted-foreground">
            Local coverage, live when it matters.
          </p>
          <Button
            asChild
            className="bg-brand-red text-white hover:bg-brand-red/90"
          >
            <Link href="/live">
              <Play className="fill-current" /> Watch live
            </Link>
          </Button>
        </div>
      </div>

      <div className="container-news flex h-[72px] items-center justify-between gap-2 lg:hidden">
        <MobileNavigation />
        <Link href="/" className="text-center" aria-label="Harborline home">
          <span className="font-editorial block text-[1.8rem] font-semibold leading-none tracking-[-0.055em] text-brand-navy">
            Harborline
          </span>
          <span className="mt-1 block text-[0.52rem] font-bold uppercase tracking-[0.28em] text-brand-blue">
            Local Journal
          </span>
        </Link>
        <div className="flex items-center gap-0.5">
          <ThemeMenu />
          <Button
            asChild
            size="icon"
            className="bg-brand-red text-white hover:bg-brand-red/90"
            aria-label="Watch live"
          >
            <Link href="/live">
              <Play className="fill-current" />
            </Link>
          </Button>
        </div>
      </div>

      <nav
        className="hidden border-y border-b-[3px] border-b-brand-navy/80 lg:block"
        aria-label="Primary navigation"
      >
        <div className="container-news flex h-11 items-center justify-center gap-9">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.76rem] font-bold uppercase tracking-[0.09em] text-brand-navy transition-colors hover:text-brand-blue"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-b bg-secondary/70">
        <div className="container-news flex min-h-10 items-center gap-4 overflow-hidden text-xs">
          <span className="shrink-0 font-black uppercase tracking-[0.15em] text-brand-red">
            Developing
          </span>
          <span className="h-4 w-px shrink-0 bg-border" />
          <Link
            href="/story/port-alder-council-unveils-harbor-resilience-plan"
            className="truncate font-semibold hover:underline"
          >
            City releases $48M working-waterfront resilience plan
          </Link>
          <span className="hidden h-4 w-px shrink-0 bg-border md:block" />
          <Link
            href="/weather"
            className="hidden shrink-0 font-semibold hover:underline md:block"
          >
            Coastal storm watch begins Tuesday at 6 a.m.
          </Link>
        </div>
      </div>
    </header>
  );
}

function Masthead() {
  return (
    <Link
      href="/"
      className="group text-center"
      aria-label="Harborline Local home"
    >
      <span className="font-editorial block text-[4.25rem] font-semibold leading-[0.78] tracking-[-0.075em] text-brand-navy">
        Harborline
      </span>
      <span className="mt-3 flex items-center justify-center gap-3 text-[0.62rem] font-bold uppercase tracking-[0.36em] text-brand-blue">
        <span className="h-px w-10 bg-brand-yellow" />
        Local Journal
        <span className="h-px w-10 bg-brand-yellow" />
      </span>
    </Link>
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
          <SheetTitle>
            <BrandMark inverse />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-6 py-5" aria-label="Mobile navigation">
          {siteConfig.navigation.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                className="font-editorial border-b py-4 text-xl font-semibold text-brand-navy"
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
          <Separator className="my-5" />
          <SheetClose asChild>
            <Link href="/search" className="py-2 font-semibold">
              Search Harborline
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/newsletter" className="py-2 font-semibold">
              Newsletters & alerts
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/about" className="py-2 font-semibold">
              About Harborline
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/studio" className="py-2 font-semibold">
              Newsroom sign in
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
