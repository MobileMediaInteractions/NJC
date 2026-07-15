"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, BookOpenText, ChevronLeft, FilePlus2, LayoutDashboard, Library, Newspaper, Settings, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioUser } from "@/lib/types";

const navigation = [
  { label: "Dashboard", href: "/studio", icon: LayoutDashboard },
  { label: "Stories", href: "/studio/stories", icon: BookOpenText },
  { label: "Media", href: "/studio/media", icon: Library },
  { label: "Press requests", href: "/studio/press", icon: Newspaper },
  { label: "Analytics", href: "/studio/analytics", icon: BarChart3 },
  { label: "Team & roles", href: "/studio/team", icon: Users },
  { label: "Portable exports", href: "/studio/exports", icon: Archive },
  { label: "Settings", href: "/studio/settings", icon: Settings },
];

export function StudioShell({ children, viewer }: { children: React.ReactNode; viewer: StudioUser }) {
  const pathname = usePathname();
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[16rem_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#061f31] text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-5 py-5"><BrandMark inverse /></div>
          <div className="px-5 pt-5"><Badge className="rounded-sm bg-brand-yellow text-brand-navy">Newsroom Studio</Badge></div>
          <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Studio navigation">
            {navigation.map((item) => {
              const active = item.href === "/studio" ? pathname === item.href : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/62 transition-colors hover:bg-white/7 hover:text-white", active && "bg-white/10 text-white")}><item.icon className="size-4" />{item.label}</Link>;
            })}
          </nav>
          <div className="border-t border-white/10 p-4"><Link href="/" className="flex items-center gap-2 text-xs font-semibold text-white/55 hover:text-white"><ChevronLeft className="size-3.5" /> View public site</Link></div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-7">
            <div className="flex items-center gap-3 lg:hidden"><BrandMark compact /><Badge variant="secondary">Studio</Badge></div>
            <p className="hidden text-sm font-medium text-muted-foreground lg:block">Middlesex County desk</p>
            <div className="flex items-center gap-3"><Button asChild size="sm"><Link href="/studio/stories/new"><FilePlus2 /> New story</Link></Button><div className="hidden items-center gap-2 sm:flex"><Avatar className="size-8"><AvatarFallback className="bg-brand-blue text-xs text-white">{viewer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</AvatarFallback></Avatar><div><p className="text-xs font-semibold">{viewer.name}</p><p className="text-[0.65rem] capitalize text-muted-foreground">{viewer.role}</p></div></div></div>
          </header>
          <main className="p-4 sm:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
