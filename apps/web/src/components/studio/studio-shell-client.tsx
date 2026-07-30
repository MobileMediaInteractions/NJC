"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  Coins,
  CircleDollarSign,
  ExternalLink,
  FilePlus2,
  FileText,
  FileVideo2,
  Flag,
  FolderOpen,
  Home,
  Inbox,
  KeyRound,
  Layers3,
  LayoutDashboard,
  Library,
  Menu,
  MessageCircleMore,
  MessageSquareWarning,
  Megaphone,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Scale,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { StudioCommandPalette } from "@/components/studio/studio-command-palette";
import {
  StudioCommunicationControls,
  formatUnread,
  useStudioCommunication,
} from "@/components/studio/studio-communication-controls";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatTipBadge } from "@/lib/newsroom-tips";
import {
  getStudioHubSecondaryItems,
  getStudioModuleForPathname,
  resolveStudioNavigation,
  studioNavigationHref,
  usesCleanStudioNavigationPaths,
  type StudioHubId,
  type StudioNavigationHub,
  type StudioNavigationItem,
} from "@/lib/studio-navigation";
import type { StudioUser } from "@/lib/types";
import type { SiteConfiguration } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

const sidebarStorageKey = "njc:studio:sidebar-collapsed:v1";

const hubIcons: Record<StudioHubId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  editorial: BookOpenText,
  distribution: Share2,
  communications: MessageCircleMore,
  "njc-plus": Clapperboard,
  finance: CircleDollarSign,
  control: Settings,
  configuration: SlidersHorizontal,
};

const itemIcons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  stories: BookOpenText,
  media: Library,
  tips: Inbox,
  "press-releases": FileText,
  "press-requests": Newspaper,
  "distribution-manager": FolderOpen,
  exports: Archive,
  chat: MessageCircleMore,
  team: Users,
  analytics: BarChart3,
  settings: Settings,
  "legal-registry": Scale,
  "notification-campaigns": Megaphone,
  "njc-plus-overview": Activity,
  "njc-plus-content": FileVideo2,
  "njc-plus-homepage": Home,
  "njc-plus-commerce": Layers3,
  "njc-plus-access": KeyRound,
  "njc-plus-credits": Coins,
  "njc-plus-comments": MessageSquareWarning,
  "njc-plus-analytics": BarChart3,
  "njc-plus-audit": ScrollText,
  "njc-plus-flags": Flag,
  "finance-overview": CircleDollarSign,
  "finance-ledger": ScrollText,
  "finance-reconciliation": Scale,
  "finance-settings": SlidersHorizontal,
};

export function StudioShellClient({
  children,
  viewer,
  newTipCount,
  unreadChatCount,
  chatEnabled,
  pressEnabled,
  alertsEnabled,
  financeEnabled,
  studioConfiguration,
}: {
  children: React.ReactNode;
  viewer: StudioUser;
  newTipCount: number;
  unreadChatCount: number;
  chatEnabled: boolean;
  pressEnabled: boolean;
  alertsEnabled: boolean;
  financeEnabled: boolean;
  studioConfiguration: SiteConfiguration["studio"];
}) {
  const pathname = usePathname();
  const cleanStudioPaths = usesCleanStudioNavigationPaths(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const communication = useStudioCommunication({
    enabled: chatEnabled,
    initialUnread: unreadChatCount,
  });
  const context = {
    role: viewer.role,
    chatEnabled,
    pressEnabled,
    alertsEnabled,
    financeEnabled,
    modules: studioConfiguration.modules,
  };
  const { hubs, activeHub, activeItem } = resolveStudioNavigation(
    pathname,
    context,
  );
  const requestedModule = getStudioModuleForPathname(pathname);
  const moduleDisabled =
    requestedModule && studioConfiguration.modules[requestedModule] === false;
  const tipBadge = formatTipBadge(newTipCount);
  const chatBadge = communication.unreadChat
    ? formatUnread(communication.unreadChat)
    : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem(sidebarStorageKey) === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!studioConfiguration.experience.commandPalette) return;
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [studioConfiguration.experience.commandPalette]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarStorageKey, String(next));
      return next;
    });
  }

  const navigationProps = {
    hubs,
    activeHub,
    activeItem,
    tipBadge,
    newTipCount,
    chatBadge,
    unreadChatCount: communication.unreadChat,
    cleanStudioPaths,
  };
  const primaryAction = getPrimaryAction(activeHub.id, pressEnabled);
  const quickActions = getQuickActions(hubs, pressEnabled);

  return (
    <div className="min-h-screen bg-[#f4f1e9] text-foreground dark:bg-[#071a14]">
      <div
        className={cn(
          "min-h-screen transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none lg:grid",
          collapsed
            ? "lg:grid-cols-[4.75rem_minmax(0,1fr)]"
            : studioConfiguration.experience.compactNavigation
              ? "lg:grid-cols-[15.5rem_minmax(0,1fr)]"
              : "lg:grid-cols-[17.5rem_minmax(0,1fr)]",
        )}
      >
        <aside className="dark sticky top-0 hidden h-screen min-h-0 border-r border-white/10 bg-[#071f18] text-white shadow-[8px_0_30px_rgba(0,0,0,.08)] lg:flex lg:flex-col">
          <SidebarHeader collapsed={collapsed} onToggle={toggleCollapsed} />
          <SidebarNavigation {...navigationProps} collapsed={collapsed} />
          <SidebarFooter collapsed={collapsed} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="dark w-[18rem] max-w-[88vw] gap-0 border-white/10 bg-[#0b271e] p-0 text-white"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Newsroom Studio navigation</SheetTitle>
            </SheetHeader>
            <SidebarHeader onToggle={() => setMobileOpen(false)} mobile />
            <SidebarNavigation
              {...navigationProps}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
            <SidebarFooter
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[4.75rem] items-center justify-between border-b bg-background/92 px-3 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open Studio navigation"
              >
                <Menu />
              </Button>
              <div className="lg:hidden">
                <BrandMark compact />
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-primary">
                  {activeHub.label}
                </p>
                <p className="truncate text-sm font-semibold">
                  {activeItem?.label ?? activeHub.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {studioConfiguration.experience.commandPalette ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-2 bg-background/60 px-2.5 text-muted-foreground sm:min-w-48 sm:justify-between"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Open Studio command center"
                >
                  <span className="flex items-center gap-2">
                    <Search />
                    <span className="hidden sm:inline">Search Studio</span>
                  </span>
                  <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] sm:inline">
                    ⌘K
                  </kbd>
                </Button>
              ) : null}
              <StudioCommunicationControls
                enabled={chatEnabled}
                unreadNotifications={communication.unreadNotifications}
                notifications={communication.notifications}
                status={communication.status}
                setStatus={communication.setStatus}
                markNotificationRead={communication.markNotificationRead}
              />
              {primaryAction ? (
                <Button asChild size="sm">
                  <Link
                    href={studioNavigationHref(
                      primaryAction.href,
                      cleanStudioPaths,
                    )}
                  >
                    <FilePlus2 />
                    <span className="hidden md:inline">
                      {primaryAction.label}
                    </span>
                    <span className="sr-only md:hidden">
                      {primaryAction.label}
                    </span>
                  </Link>
                </Button>
              ) : null}
              <AccountMenu viewer={viewer} />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[92rem] p-4 sm:p-6 lg:p-8">
            {moduleDisabled ? (
              <div className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center text-center">
                <div className="rounded-2xl border bg-card p-8 shadow-sm">
                  <SlidersHorizontal className="mx-auto size-9 text-primary" />
                  <h1 className="mt-4 text-2xl font-bold">
                    This workspace is paused
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    An administrator disabled this Studio workspace in the
                    central configuration. Its data has not been deleted.
                  </p>
                  {viewer.role === "admin" ? (
                    <Button asChild className="mt-5">
                      <Link
                        href={studioNavigationHref(
                          "/studio/settings",
                          cleanStudioPaths,
                        )}
                      >
                        Open Configuration
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : children}
          </main>
        </div>
      </div>
      {studioConfiguration.experience.commandPalette ? (
        <StudioCommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          hubs={hubs}
          cleanStudioPaths={cleanStudioPaths}
          quickActions={
            studioConfiguration.experience.contextualQuickActions
              ? quickActions
              : []
          }
        />
      ) : null}
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
    <div
      className={cn(
        "flex h-[4.75rem] shrink-0 items-center border-b border-white/10",
        collapsed ? "justify-center px-2" : "justify-between gap-3 px-4",
      )}
    >
      <div className="min-w-0 overflow-hidden">
        <BrandMark
          inverse
          compact={collapsed}
          className={cn(
            "transition-opacity duration-200 motion-reduce:transition-none",
            collapsed && "justify-center",
          )}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
        aria-label={
          mobile
            ? "Close Studio navigation"
            : collapsed
              ? "Expand Studio navigation"
              : "Collapse Studio navigation"
        }
        title={
          mobile
            ? "Close navigation"
            : collapsed
              ? "Expand navigation"
              : "Collapse navigation"
        }
      >
        {mobile ? (
          <ChevronLeft />
        ) : collapsed ? (
          <PanelLeftOpen />
        ) : (
          <PanelLeftClose />
        )}
      </Button>
    </div>
  );
}

function SidebarNavigation({
  collapsed,
  hubs,
  activeHub,
  activeItem,
  tipBadge,
  newTipCount,
  chatBadge,
  unreadChatCount,
  cleanStudioPaths,
  onNavigate,
}: {
  collapsed: boolean;
  hubs: StudioNavigationHub[];
  activeHub: StudioNavigationHub;
  activeItem: StudioNavigationItem | undefined;
  tipBadge: string | null;
  newTipCount: number;
  chatBadge: string | null;
  unreadChatCount: number;
  cleanStudioPaths: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 [scrollbar-color:rgba(255,255,255,.16)_transparent]">
      {!collapsed ? (
        <div className="px-4 pb-4">
          <Badge className="rounded-sm bg-brand-yellow text-brand-navy">
            Newsroom Studio
          </Badge>
        </div>
      ) : null}
      <nav
        className={cn(collapsed ? "px-2" : "px-3")}
        aria-label="Studio navigation"
      >
        {!collapsed ? (
          <p className="mb-1.5 px-2 text-[0.62rem] font-black uppercase tracking-[0.17em] text-white/35">
            Workspaces
          </p>
        ) : null}
        <div className="space-y-1">
          {hubs.map((hub) => {
            const Icon = hubIcons[hub.id];
            const active = hub.id === activeHub.id;
            const hubBadge = badgeForHub(hub, tipBadge, chatBadge);
            return (
              <Link
                key={hub.id}
                href={studioNavigationHref(
                  hub.items[0]!.href,
                  cleanStudioPaths,
                )}
                onClick={onNavigate}
                title={collapsed ? hub.label : undefined}
                className={cn(
                  "group relative flex items-center rounded-lg text-sm font-semibold text-white/58 transition-colors hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow",
                  collapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-2.5 py-2.5",
                  active &&
                    "bg-brand-yellow text-brand-navy shadow-sm hover:bg-brand-yellow hover:text-brand-navy",
                )}
                aria-current={
                  active && activeItem?.href === hub.items[0]?.href
                    ? "page"
                    : undefined
                }
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate">
                      {hub.label}
                    </span>
                    {hubBadge ? (
                      <NavigationBadge
                        label={hubBadge.label}
                        value={hubBadge.value}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="sr-only">{hub.label}</span>
                    {hubBadge ? (
                      <span
                        className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-[#0b271e]"
                        aria-label={hubBadge.label}
                      />
                    ) : null}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {!collapsed &&
        (getStudioHubSecondaryItems(activeHub).length > 0 ||
          activeHub.id === "njc-plus") ? (
          <section className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3 px-2">
              <div className="min-w-0">
                <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.17em] text-white/35">
                  In {activeHub.label}
                </p>
                <p className="mt-0.5 truncate text-[0.66rem] text-white/38">
                  {activeHub.description}
                </p>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-white/25" />
            </div>
            <div className="space-y-0.5">
              {getStudioHubSecondaryItems(activeHub).map((item) => {
                const Icon = itemIcons[item.id] ?? LayoutDashboard;
                const active = activeItem?.id === item.id;
                const badge = badgeForItem(
                  item,
                  tipBadge,
                  newTipCount,
                  chatBadge,
                  unreadChatCount,
                );
                return (
                  <Link
                    key={item.id}
                    href={studioNavigationHref(
                      item.href,
                      cleanStudioPaths,
                    )}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold text-white/45 transition-colors hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow",
                      active &&
                        "bg-white/12 pl-4 text-brand-yellow before:absolute before:inset-y-1.5 before:left-1 before:w-0.5 before:rounded-full before:bg-brand-yellow",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                    {badge ? (
                      <NavigationBadge
                        label={badge.label}
                        value={badge.value}
                      />
                    ) : null}
                  </Link>
                );
              })}
              {activeHub.id === "njc-plus" ? (
                <Link
                  href="/plus?preview=studio"
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold text-[#b9ff4a]/70 transition-colors hover:bg-white/7 hover:text-[#b9ff4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                >
                  <ExternalLink className="size-3.5" />
                  Private preview
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}
      </nav>
    </div>
  );
}

function SidebarFooter({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-white/10",
        collapsed ? "p-2" : "p-3",
      )}
    >
      <Link
        href="/"
        onClick={onNavigate}
        title={collapsed ? "View public site" : undefined}
        className={cn(
          "flex items-center rounded-md text-xs font-semibold text-white/50 transition-colors hover:bg-white/7 hover:text-white",
          collapsed ? "justify-center p-2.5" : "gap-2 px-2 py-2",
        )}
      >
        <ChevronLeft className="size-3.5 shrink-0" />
        {!collapsed ? (
          "View public site"
        ) : (
          <span className="sr-only">View public site</span>
        )}
      </Link>
    </div>
  );
}

function AccountMenu({ viewer }: { viewer: StudioUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Open Studio account menu"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand-blue text-xs text-white">
              {initials(viewer.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-sm font-semibold text-foreground">
            {viewer.name}
          </span>
          <span className="mt-0.5 block text-[0.68rem] font-normal capitalize text-muted-foreground">
            {viewer.role} · Middlesex County desk
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="px-2 py-2">
          <Link href="/studio/profile">
            <UserRound /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="px-2 py-2">
          <Link href="/staff">
            <Users /> Public staff site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="px-2 py-2">
          <Link href="/">
            <ExternalLink /> View publication
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getPrimaryAction(hub: StudioHubId, pressEnabled: boolean) {
  if (hub === "distribution" && pressEnabled) {
    return {
      label: "New release",
      href: "/studio/press-releases/new",
    };
  }
  if (hub === "njc-plus") {
    return {
      label: "New NJC+ item",
      href: "/studio/njc-plus/content/new",
    };
  }
  if (hub === "overview" || hub === "editorial") {
    return {
      label: "New story",
      href: "/studio/stories/new",
    };
  }
  return null;
}

function getQuickActions(
  hubs: StudioNavigationHub[],
  pressEnabled: boolean,
) {
  const itemIds = new Set(
    hubs.flatMap((hub) => hub.items.map((item) => item.id)),
  );
  return [
    itemIds.has("stories")
      ? {
          id: "new-story",
          label: "Create a story",
          description: "Start a newsroom draft",
          href: "/studio/stories/new",
        }
      : null,
    pressEnabled && itemIds.has("press-releases")
      ? {
          id: "new-press-release",
          label: "Create a press release",
          description: "Start a release and PDF",
          href: "/studio/press-releases/new",
        }
      : null,
    itemIds.has("njc-plus-content")
      ? {
          id: "new-njc-plus",
          label: "Create NJC+ content",
          description: "Start premium video, audio, or editorial",
          href: "/studio/njc-plus/content/new",
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);
}

function badgeForItem(
  item: StudioNavigationItem,
  tipBadge: string | null,
  newTipCount: number,
  chatBadge: string | null,
  unreadChatCount: number,
) {
  if (item.id === "tips" && tipBadge) {
    return { value: tipBadge, label: `${newTipCount} new news tips` };
  }
  if (item.id === "chat" && chatBadge) {
    return {
      value: chatBadge,
      label: `${unreadChatCount} unread team messages`,
    };
  }
  return null;
}

function badgeForHub(
  hub: StudioNavigationHub,
  tipBadge: string | null,
  chatBadge: string | null,
) {
  if (hub.items.some((item) => item.id === "tips") && tipBadge) {
    return { value: tipBadge, label: "New news tips" };
  }
  if (hub.items.some((item) => item.id === "chat") && chatBadge) {
    return { value: chatBadge, label: "Unread team messages" };
  }
  return null;
}

function NavigationBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-white"
      aria-label={label}
    >
      {value}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
