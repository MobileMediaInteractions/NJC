"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  ContactRound,
  ExternalLink,
  FilePlus2,
  FileText,
  Inbox,
  LayoutDashboard,
  Library,
  Menu,
  MessageCircleMore,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  StudioCommunicationControls,
  formatUnread,
  useStudioCommunication,
} from "@/components/studio/studio-communication-controls";
import { njcPlusStudioSections } from "@/components/studio/njc-plus-nav";
import { formatTipBadge } from "@/lib/newsroom-tips";
import { cn } from "@/lib/utils";
import type { StudioUser } from "@/lib/types";

type StudioNavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  excludesContributor?: boolean;
  requiresChat?: boolean;
  requiresPress?: boolean;
  external?: boolean;
};

const navigationGroups: Array<{ label: string; items: StudioNavigationItem[] }> = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/studio", icon: LayoutDashboard },
      { label: "Stories", href: "/studio/stories", icon: BookOpenText },
      { label: "NJC+", href: "/studio/njc-plus", icon: Clapperboard },
      { label: "Media", href: "/studio/media", icon: Library },
    ],
  },
  {
    label: "Newsroom",
    items: [
      { label: "Team chat", href: "/studio/chat", icon: MessageCircleMore, requiresChat: true },
      { label: "News tips", href: "/studio/tips", icon: Inbox, excludesContributor: true },
      { label: "Press requests", href: "/studio/press", icon: Newspaper },
      { label: "Press releases", href: "/studio/press-releases", icon: FileText, requiresPress: true },
    ],
  },
  {
    label: "Staff",
    items: [
      { label: "My staff profile", href: "/studio/profile", icon: UserRound },
      { label: "Team & roles", href: "/studio/team", icon: Users },
      { label: "Public staff site", href: "/staff", icon: ContactRound, external: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Analytics", href: "/studio/analytics", icon: BarChart3 },
      { label: "Portable exports", href: "/studio/exports", icon: Archive },
      { label: "Settings", href: "/studio/settings", icon: Settings },
    ],
  },
];

export function StudioShellClient({
  children,
  viewer,
  newTipCount,
  unreadChatCount,
  chatEnabled,
  pressEnabled,
}: {
  children: React.ReactNode;
  viewer: StudioUser;
  newTipCount: number;
  unreadChatCount: number;
  chatEnabled: boolean;
  pressEnabled: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [njcPlusOpen, setNjcPlusOpen] = useState(pathname.startsWith("/studio/njc-plus"));
  const tipBadge = formatTipBadge(newTipCount);
  const communication = useStudioCommunication({ enabled: chatEnabled, initialUnread: unreadChatCount });
  const chatBadge = communication.unreadChat ? formatUnread(communication.unreadChat) : null;
  const navigationProps = {
    viewer,
    pathname,
    newTipCount,
    tipBadge,
    chatBadge,
    unreadChatCount: communication.unreadChat,
    chatEnabled,
    pressEnabled,
    njcPlusOpen,
    setNjcPlusOpen,
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div
        className={cn(
          "min-h-screen transition-[grid-template-columns] duration-300 ease-out lg:grid",
          collapsed ? "lg:grid-cols-[5rem_minmax(0,1fr)]" : "lg:grid-cols-[17.5rem_minmax(0,1fr)]",
        )}
      >
        <aside className="sticky top-0 hidden h-screen min-h-0 border-r border-white/10 bg-[#061f31] text-white lg:flex lg:flex-col">
          <SidebarHeader collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
          <SidebarNavigation {...navigationProps} collapsed={collapsed} />
          <SidebarFooter collapsed={collapsed} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" showCloseButton={false} className="dark w-[19rem] max-w-[88vw] gap-0 border-white/10 bg-[#061f31] p-0 text-white">
            <SheetHeader className="sr-only">
              <SheetTitle>Newsroom Studio navigation</SheetTitle>
            </SheetHeader>
            <SidebarHeader onToggle={() => setMobileOpen(false)} mobile />
            <SidebarNavigation {...navigationProps} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-3 backdrop-blur sm:px-7">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open Studio navigation"
              >
                <Menu />
              </Button>
              <div className="lg:hidden"><BrandMark compact /></div>
              <Badge variant="secondary" className="hidden sm:inline-flex lg:hidden">Studio</Badge>
              <p className="hidden text-sm font-medium text-muted-foreground lg:block">Middlesex County desk</p>
              {tipBadge && viewer.role !== "contributor" ? (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex lg:hidden">
                  <Link href="/studio/tips" aria-label={`${newTipCount} new news tips`}>
                    <Inbox />
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-white">{tipBadge}</span>
                  </Link>
                </Button>
              ) : null}
              {chatEnabled ? (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex lg:hidden">
                  <Link href="/studio/chat" aria-label={`${communication.unreadChat} unread team messages`}>
                    <MessageCircleMore />
                    {chatBadge ? <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-white">{chatBadge}</span> : null}
                  </Link>
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <StudioCommunicationControls
                enabled={chatEnabled}
                unreadNotifications={communication.unreadNotifications}
                notifications={communication.notifications}
                status={communication.status}
                setStatus={communication.setStatus}
                markNotificationRead={communication.markNotificationRead}
              />
              <Button asChild size="sm">
                <Link href="/studio/stories/new">
                  <FilePlus2 />
                  <span className="hidden md:inline">New story</span>
                  <span className="sr-only md:hidden">New story</span>
                </Link>
              </Button>
              <Link
                href="/studio/profile"
                className="hidden items-center gap-2 rounded-md p-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:flex"
                aria-label="Open my staff profile"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-brand-blue text-xs text-white">{initials(viewer.name)}</AvatarFallback>
                </Avatar>
                <div className="hidden xl:block">
                  <p className="text-xs font-semibold">{viewer.name}</p>
                  <p className="text-[0.65rem] capitalize text-muted-foreground">{viewer.role}</p>
                </div>
              </Link>
            </div>
          </header>
          <main className="p-4 sm:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
}

function SidebarHeader({
  collapsed = false,
  mobile = false,
  onToggle,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("flex h-[5.25rem] shrink-0 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "justify-between gap-3 px-5")}>
      <div className="min-w-0 overflow-hidden">
        <BrandMark inverse compact={collapsed} className={cn("transition-opacity duration-200", collapsed && "justify-center")} />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
        aria-label={mobile ? "Close Studio navigation" : collapsed ? "Expand Studio navigation" : "Collapse Studio navigation"}
        title={mobile ? "Close navigation" : collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        {mobile ? <ChevronLeft /> : collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>
    </div>
  );
}

function SidebarNavigation({
  collapsed,
  viewer,
  pathname,
  newTipCount,
  tipBadge,
  chatBadge,
  unreadChatCount,
  chatEnabled,
  pressEnabled,
  njcPlusOpen,
  setNjcPlusOpen,
  onNavigate,
}: {
  collapsed: boolean;
  viewer: StudioUser;
  pathname: string;
  newTipCount: number;
  tipBadge: string | null;
  chatBadge: string | null;
  unreadChatCount: number;
  chatEnabled: boolean;
  pressEnabled: boolean;
  njcPlusOpen: boolean;
  setNjcPlusOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onNavigate?: () => void;
}) {
  const showPlusChildren = !collapsed && njcPlusOpen;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 [scrollbar-color:rgba(255,255,255,.16)_transparent]">
      {!collapsed ? <div className="px-5 pb-3"><Badge className="rounded-sm bg-brand-yellow text-brand-navy">Newsroom Studio</Badge></div> : null}
      <nav className={cn("space-y-5", collapsed ? "px-2" : "px-3")} aria-label="Studio navigation">
        {navigationGroups.map((group) => {
          const items = group.items.filter((item) =>
            (!item.excludesContributor || viewer.role !== "contributor") &&
            (!item.requiresChat || chatEnabled) &&
            (!item.requiresPress || pressEnabled));
          return <section key={group.label}>
            {!collapsed ? <p className="mb-1.5 px-3 text-[0.62rem] font-black uppercase tracking-[0.17em] text-white/35">{group.label}</p> : null}
            <div className="space-y-1">
              {items.map((item) => {
                const active = item.href === "/studio"
                  ? pathname === item.href
                  : !item.external && pathname.startsWith(item.href);
                const showTipBadge = item.href === "/studio/tips" && tipBadge;
                const showChatBadge = item.href === "/studio/chat" && chatBadge;
                const isPlus = item.href === "/studio/njc-plus";
                return <div key={item.href}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (isPlus) setNjcPlusOpen(true);
                        onNavigate?.();
                      }}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex min-w-0 flex-1 items-center rounded-md text-sm font-medium text-white/62 transition-[background-color,color,padding] duration-200 hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow",
                        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                        active && "bg-white/10 text-white",
                        isPlus && showPlusChildren && "rounded-r-none",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
                      {!collapsed && item.external ? <ExternalLink className="ml-auto size-3 text-white/35" /> : null}
                      {!collapsed && showTipBadge ? <NavigationBadge label={`${newTipCount} new news tips`} value={tipBadge} /> : null}
                      {!collapsed && showChatBadge ? <NavigationBadge label={`${unreadChatCount} unread team messages`} value={chatBadge} /> : null}
                      {collapsed && (showTipBadge || showChatBadge) ? <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-[#061f31]" aria-label={showTipBadge ? `${newTipCount} new news tips` : `${unreadChatCount} unread team messages`} /> : null}
                    </Link>
                    {isPlus && !collapsed ? <button
                      type="button"
                      onClick={() => setNjcPlusOpen((value) => !value)}
                      className={cn(
                        "grid self-stretch place-items-center rounded-r-md px-2 text-white/45 transition-colors hover:bg-white/7 hover:text-white",
                        active && "bg-white/10 text-white",
                      )}
                      aria-label={showPlusChildren ? "Collapse NJC+ tools" : "Expand NJC+ tools"}
                      aria-expanded={showPlusChildren}
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform duration-200", showPlusChildren && "rotate-180")} />
                    </button> : null}
                  </div>
                  {isPlus && showPlusChildren ? <div className="relative ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                    {njcPlusStudioSections.map((section) => {
                      const childActive = section.href === "/studio/njc-plus"
                        ? pathname === section.href
                        : pathname.startsWith(section.href);
                      return <Link
                        key={section.href}
                        href={section.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold text-white/45 transition-colors hover:bg-white/7 hover:text-white",
                          childActive && "bg-white/8 text-brand-yellow",
                        )}
                      >
                        <section.icon className="size-3.5 shrink-0" />
                        <span>{section.label}</span>
                      </Link>;
                    })}
                    <Link href="/plus?preview=studio" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold text-[#b9ff4a]/75 transition-colors hover:bg-white/7 hover:text-[#b9ff4a]">
                      <ExternalLink className="size-3.5" /> Private preview
                    </Link>
                  </div> : null}
                </div>;
              })}
            </div>
          </section>;
        })}
      </nav>
    </div>
  );
}

function SidebarFooter({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className={cn("shrink-0 border-t border-white/10", collapsed ? "p-2" : "p-4")}>
      <Link
        href="/"
        onClick={onNavigate}
        title={collapsed ? "View public site" : undefined}
        className={cn(
          "flex items-center rounded-md text-xs font-semibold text-white/55 transition-colors hover:bg-white/7 hover:text-white",
          collapsed ? "justify-center p-2.5" : "gap-2 px-2 py-2",
        )}
      >
        <ChevronLeft className="size-3.5 shrink-0" />
        {!collapsed ? "View public site" : <span className="sr-only">View public site</span>}
      </Link>
    </div>
  );
}

function NavigationBadge({ label, value }: { label: string; value: string }) {
  return <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-white" aria-label={label}>{value}</span>;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
}
