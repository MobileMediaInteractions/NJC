"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CircleHelp,
  ExternalLink,
  FilePlus2,
  Menu,
  MessageCircleMore,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { StudioCommandPalette } from "@/components/studio/studio-command-palette";
import { StudioMiniChat } from "@/components/studio/studio-mini-chat";
import { StudioWorkspaceNavigation } from "@/components/studio/studio-workspace-navigation";
import {
  StudioCommunicationControls,
  formatUnread,
  useStudioCommunication,
} from "@/components/studio/studio-communication-controls";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  getStudioModuleForPathname,
  resolveStudioNavigation,
  studioNavigationHref,
  usesCleanStudioNavigationPaths,
  type StudioHubId,
  type StudioNavigationHub,
} from "@/lib/studio-navigation";
import type { StudioUser } from "@/lib/types";
import type { SiteConfiguration } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

const sidebarStorageKey = "njc:studio:sidebar-collapsed:v1";
const miniChatStorageKey = "njc:studio:mini-chat-enabled:v1";

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
  const [miniChatEnabled, setMiniChatEnabled] = useState(false);
  const [miniChatOpen, setMiniChatOpen] = useState(false);
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
      setMiniChatEnabled(
        window.localStorage.getItem(miniChatStorageKey) === "true",
      );
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

  function toggleMiniChat() {
    if (!miniChatEnabled) {
      window.localStorage.setItem(miniChatStorageKey, "true");
      setMiniChatEnabled(true);
      setMiniChatOpen(true);
      return;
    }
    setMiniChatOpen((current) => !current);
  }

  function disableMiniChat() {
    window.localStorage.setItem(miniChatStorageKey, "false");
    setMiniChatEnabled(false);
    setMiniChatOpen(false);
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
  const standaloneWorkspace = activeHub.id === "teamspace";

  return (
    <div className="studio-app min-h-screen bg-[#eef0eb] text-foreground dark:bg-[#07100c]">
      <div
        className={cn(
          "min-h-screen transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none lg:grid",
          collapsed
            ? "lg:grid-cols-[4.75rem_minmax(0,1fr)]"
            : studioConfiguration.experience.compactNavigation
              ? "lg:grid-cols-[19rem_minmax(0,1fr)]"
              : "lg:grid-cols-[21rem_minmax(0,1fr)]",
        )}
      >
        <aside className="sticky top-0 hidden h-screen min-h-0 shadow-[10px_0_34px_rgba(3,24,17,.1)] lg:block">
          <StudioWorkspaceNavigation
            {...navigationProps}
            collapsed={collapsed}
          />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="dark w-[20rem] max-w-[92vw] gap-0 border-white/10 bg-[#061b16] p-0 text-white"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Newsroom Studio navigation</SheetTitle>
            </SheetHeader>
            <StudioWorkspaceNavigation
              {...navigationProps}
              collapsed={false}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[4.75rem] items-center justify-between border-b border-black/8 bg-[#f7f7f3]/90 px-3 backdrop-blur-2xl dark:border-white/8 dark:bg-[#0d1713]/90 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open Studio navigation"
              >
                <Menu />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={toggleCollapsed}
                aria-pressed={collapsed}
                aria-label={
                  collapsed
                    ? "Show workspace navigation"
                    : "Hide workspace navigation"
                }
                title={
                  collapsed
                    ? "Show workspace navigation"
                    : "Hide workspace navigation"
                }
              >
                {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              </Button>
              <div className="lg:hidden">
                <BrandMark compact />
              </div>
              <div className="hidden min-w-0 border-l pl-3 sm:block">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-primary/65">
                  {activeHub.label}
                </p>
                <p className="truncate text-sm font-semibold">
                  {activeItem?.label ?? activeHub.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {studioConfiguration.experience.commandPalette ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-2 border-black/8 bg-white/55 px-2.5 text-muted-foreground shadow-none dark:border-white/10 dark:bg-white/5 sm:min-w-44 sm:justify-between"
                  onClick={() => setCommandOpen(true)}
                  aria-label="Open Studio command center"
                >
                  <span className="flex items-center gap-2">
                    <Search />
                    <span className="hidden sm:inline">Find or run</span>
                  </span>
                  <kbd className="hidden rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.58rem] sm:inline">
                    ⌘K
                  </kbd>
                </Button>
              ) : null}
              {studioConfiguration.modules.commandReference ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  asChild
                  aria-label="Open Studio commands and shortcuts"
                  title="Commands and shortcuts"
                >
                  <Link
                    href={studioNavigationHref(
                      "/studio/commands",
                      cleanStudioPaths,
                    )}
                  >
                    <CircleHelp />
                  </Link>
                </Button>
              ) : null}
              {chatEnabled && !standaloneWorkspace ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                  onClick={toggleMiniChat}
                  aria-pressed={miniChatEnabled && miniChatOpen}
                  aria-label={
                    miniChatEnabled
                      ? "Toggle newsroom mini chat"
                      : "Enable newsroom mini chat"
                  }
                  title={
                    miniChatEnabled
                      ? "Toggle floating Teamspace"
                      : "Enable floating Teamspace"
                  }
                >
                  <MessageCircleMore />
                  {communication.unreadChat ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[0.58rem] font-black leading-4 text-white">
                      {formatUnread(communication.unreadChat)}
                    </span>
                  ) : null}
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
                <Button asChild size="sm" className="shadow-sm">
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

          <main
            className={cn(
              "w-full",
              standaloneWorkspace
                ? "p-2 sm:p-3"
                : "mx-auto max-w-[96rem] p-4 sm:p-6 lg:p-7",
            )}
          >
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
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {chatEnabled && miniChatEnabled && !standaloneWorkspace ? (
        <StudioMiniChat
          open={miniChatOpen}
          onOpenChange={setMiniChatOpen}
          onDisable={disableMiniChat}
          cleanStudioPaths={cleanStudioPaths}
        />
      ) : null}
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
