"use client";

import Link from "next/link";
import {
  Activity,
  Archive,
  BarChart3,
  BookOpenText,
  ChevronLeft,
  CircleDollarSign,
  CircleHelp,
  Clapperboard,
  Coins,
  ExternalLink,
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
  MessageCircleMore,
  MessageSquareWarning,
  Megaphone,
  Network,
  Newspaper,
  ScrollText,
  Settings,
  Share2,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import {
  studioNavigationHref,
  type StudioHubId,
  type StudioNavigationHub,
  type StudioNavigationItem,
} from "@/lib/studio-navigation";
import { cn } from "@/lib/utils";

const hubIcons: Record<StudioHubId, LucideIcon> = {
  overview: LayoutDashboard,
  editorial: BookOpenText,
  distribution: Share2,
  teamspace: MessageCircleMore,
  communications: Users,
  "njc-plus": Clapperboard,
  finance: CircleDollarSign,
  control: BarChart3,
  configuration: SlidersHorizontal,
};

const itemIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "command-reference": CircleHelp,
  stories: BookOpenText,
  media: Library,
  tips: Inbox,
  "twenty-under-twenty": Activity,
  "press-releases": FileText,
  "press-requests": Newspaper,
  "distribution-manager": FolderOpen,
  exports: Archive,
  chat: MessageCircleMore,
  team: Users,
  analytics: BarChart3,
  settings: Settings,
  "legal-registry": ScrollText,
  "domain-control": Network,
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
  "finance-reconciliation": Archive,
  "finance-settings": SlidersHorizontal,
};

type NavigationBadge = {
  value: string;
  label: string;
};

export function StudioWorkspaceNavigation({
  hubs,
  activeHub,
  activeItem,
  collapsed,
  cleanStudioPaths,
  tipBadge,
  newTipCount,
  chatBadge,
  unreadChatCount,
  mobile = false,
  onNavigate,
}: {
  hubs: StudioNavigationHub[];
  activeHub: StudioNavigationHub;
  activeItem: StudioNavigationItem | undefined;
  collapsed: boolean;
  cleanStudioPaths: boolean;
  tipBadge: string | null;
  newTipCount: number;
  chatBadge: string | null;
  unreadChatCount: number;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const contextCollapsed = collapsed && !mobile;

  return (
    <div
      className={cn(
        "dark grid h-full min-h-0 bg-[#061b16] text-white",
        contextCollapsed ? "grid-cols-[4.75rem]" : "grid-cols-[4.75rem_minmax(0,1fr)]",
      )}
    >
      <div className="flex min-h-0 flex-col border-r border-white/8 bg-[#04140f]">
        <div className="grid h-[4.75rem] shrink-0 place-items-center border-b border-white/8">
          <BrandMark inverse compact />
        </div>
        <nav
          className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-3"
          aria-label="Studio workspaces"
        >
          {hubs.map((hub) => {
            const Icon = hubIcons[hub.id];
            const active = hub.id === activeHub.id;
            const badge = badgeForHub(hub, tipBadge, chatBadge);
            return (
              <Link
                key={hub.id}
                href={studioNavigationHref(hub.items[0]!.href, cleanStudioPaths)}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={hub.label}
                className={cn(
                  "relative grid min-h-12 place-items-center rounded-xl text-white/42 transition duration-150 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5a341]",
                  active &&
                    "bg-[#d5a341] text-[#102019] shadow-[0_8px_22px_rgba(213,163,65,.18)] hover:bg-[#e0af4c] hover:text-[#102019]",
                )}
              >
                <Icon className="size-[1.15rem]" strokeWidth={active ? 2.4 : 1.8} />
                <span className="sr-only">{hub.label}</span>
                {badge ? (
                  <span
                    className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-[#04140f]"
                    aria-label={badge.label}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/8 p-2">
          <Link
            href="/"
            onClick={onNavigate}
            title="View publication"
            className="grid min-h-11 place-items-center rounded-xl text-white/40 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5a341]"
          >
            <ExternalLink className="size-4" />
            <span className="sr-only">View publication</span>
          </Link>
        </div>
      </div>

      {!contextCollapsed ? (
        <div className="flex min-h-0 min-w-0 flex-col bg-[#0a241c]">
          <header className="flex h-[4.75rem] shrink-0 items-center border-b border-white/8 px-4">
            <div className="min-w-0">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#d5a341]">
                Courier Studio
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {activeHub.label}
              </p>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-4 px-2">
              <Badge className="rounded-md border border-white/10 bg-white/6 text-[0.58rem] uppercase tracking-[0.14em] text-white/60">
                Workspace
              </Badge>
              <p className="mt-2 text-xs leading-5 text-white/42">
                {activeHub.description}
              </p>
            </div>
            <nav className="space-y-1" aria-label={`${activeHub.label} sections`}>
              {activeHub.items.map((item) => {
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
                    href={studioNavigationHref(item.href, cleanStudioPaths)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-10 min-w-0 items-center gap-3 rounded-xl border border-transparent px-3 text-xs font-semibold text-white/48 transition duration-150 hover:border-white/8 hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5a341]",
                      active &&
                        "border-white/10 bg-white/10 text-white shadow-[inset_3px_0_0_#d5a341] hover:bg-white/12",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 text-white/30 transition",
                        active && "text-[#d5a341]",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge ? (
                      <span
                        className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.62rem] font-black text-white"
                        aria-label={badge.label}
                      >
                        {badge.value}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            {activeHub.id === "njc-plus" ? (
              <Link
                href="/plus?preview=studio"
                onClick={onNavigate}
                className="mt-4 flex min-h-10 items-center gap-3 rounded-xl border border-[#b9ff4a]/15 px-3 text-xs font-semibold text-[#b9ff4a]/70 transition hover:bg-[#b9ff4a]/8 hover:text-[#b9ff4a]"
              >
                <ExternalLink className="size-4" />
                Private preview
              </Link>
            ) : null}
          </div>

          <footer className="border-t border-white/8 p-3">
            <Link
              href="/"
              onClick={onNavigate}
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-white/38 transition hover:bg-white/7 hover:text-white"
            >
              <ChevronLeft className="size-3.5" />
              Back to publication
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function badgeForItem(
  item: StudioNavigationItem,
  tipBadge: string | null,
  newTipCount: number,
  chatBadge: string | null,
  unreadChatCount: number,
): NavigationBadge | null {
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
): NavigationBadge | null {
  if (hub.items.some((item) => item.id === "tips") && tipBadge) {
    return { value: tipBadge, label: "New news tips" };
  }
  if (hub.items.some((item) => item.id === "chat") && chatBadge) {
    return { value: chatBadge, label: "Unread team messages" };
  }
  return null;
}
