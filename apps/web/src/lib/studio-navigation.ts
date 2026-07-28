import type { StaffRole } from "@/lib/types";

export type StudioHubId =
  | "overview"
  | "editorial"
  | "distribution"
  | "communications"
  | "njc-plus"
  | "control";

export type StudioNavigationContext = {
  role: StaffRole;
  chatEnabled: boolean;
  pressEnabled: boolean;
};

export type StudioNavigationItem = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  roles?: readonly StaffRole[];
  requiresChat?: boolean;
  requiresPress?: boolean;
};

export type StudioNavigationHub = {
  id: StudioHubId;
  label: string;
  description: string;
  items: StudioNavigationItem[];
};

const allRoles = [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
] as const satisfies readonly StaffRole[];

const editorialRoles = [
  "admin",
  "editor",
  "producer",
  "reporter",
] as const satisfies readonly StaffRole[];

const publishingRoles = [
  "admin",
  "editor",
  "producer",
] as const satisfies readonly StaffRole[];

export const studioNavigationHubs: readonly StudioNavigationHub[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Today’s newsroom status",
    items: [
      {
        id: "dashboard",
        label: "Control room",
        href: "/studio",
        roles: allRoles,
      },
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Create and manage coverage",
    items: [
      {
        id: "stories",
        label: "Stories",
        href: "/studio/stories",
        roles: allRoles,
      },
      {
        id: "media",
        label: "Media library",
        href: "/studio/media",
        roles: allRoles,
      },
      {
        id: "tips",
        label: "News tips",
        href: "/studio/tips",
        roles: editorialRoles,
      },
    ],
  },
  {
    id: "distribution",
    label: "Distribution",
    description: "Prepare and hand off files",
    items: [
      {
        id: "distribution-manager",
        label: "File manager",
        href: "/studio/distribution",
        roles: allRoles,
      },
      {
        id: "press-releases",
        label: "Press releases",
        href: "/studio/press-releases",
        roles: publishingRoles,
        requiresPress: true,
      },
      {
        id: "press-requests",
        label: "Press requests",
        href: "/studio/press",
        roles: publishingRoles,
      },
      {
        id: "exports",
        label: "Portable exports",
        href: "/studio/exports",
        roles: allRoles,
      },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    description: "Coordinate the newsroom",
    items: [
      {
        id: "chat",
        label: "Team chat",
        href: "/studio/chat",
        roles: allRoles,
        requiresChat: true,
      },
      {
        id: "team",
        label: "Team & roles",
        href: "/studio/team",
        roles: ["admin"],
      },
    ],
  },
  {
    id: "njc-plus",
    label: "NJC+",
    description: "Premium network controls",
    items: [
      { id: "njc-plus-overview", label: "Overview", href: "/studio/njc-plus", roles: allRoles },
      { id: "njc-plus-content", label: "Content", href: "/studio/njc-plus/content", roles: allRoles },
      { id: "njc-plus-homepage", label: "Homepage", href: "/studio/njc-plus/homepage", roles: allRoles },
      { id: "njc-plus-commerce", label: "Tiers & offers", href: "/studio/njc-plus/commerce", roles: allRoles },
      { id: "njc-plus-access", label: "Access", href: "/studio/njc-plus/access", roles: allRoles },
      { id: "njc-plus-credits", label: "Credits", href: "/studio/njc-plus/credits", roles: allRoles },
      { id: "njc-plus-comments", label: "Comments", href: "/studio/njc-plus/comments", roles: allRoles },
      { id: "njc-plus-analytics", label: "Analytics", href: "/studio/njc-plus/analytics", roles: allRoles },
      { id: "njc-plus-audit", label: "Audit log", href: "/studio/njc-plus/audit", roles: allRoles },
      { id: "njc-plus-flags", label: "Feature flags", href: "/studio/njc-plus/flags", roles: allRoles },
    ],
  },
  {
    id: "control",
    label: "Control",
    description: "Audience and platform settings",
    items: [
      {
        id: "analytics",
        label: "Analytics",
        href: "/studio/analytics",
        roles: allRoles,
      },
      {
        id: "settings",
        label: "Configuration",
        href: "/studio/settings",
        roles: ["admin"],
      },
    ],
  },
] as const;

export function isStudioNavigationItemVisible(
  item: StudioNavigationItem,
  context: StudioNavigationContext,
) {
  if (item.roles && !item.roles.includes(context.role)) return false;
  if (item.requiresChat && !context.chatEnabled) return false;
  if (item.requiresPress && !context.pressEnabled) return false;
  return true;
}

export function getVisibleStudioNavigation(
  context: StudioNavigationContext,
): StudioNavigationHub[] {
  return studioNavigationHubs.flatMap((hub) => {
    const items = hub.items.filter((item) =>
      isStudioNavigationItemVisible(item, context),
    );
    return items.length ? [{ ...hub, items }] : [];
  });
}

export function isStudioRouteActive(pathname: string, href: string) {
  if (href === "/studio") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveStudioNavigation(
  pathname: string,
  context: StudioNavigationContext,
) {
  const hubs = getVisibleStudioNavigation(context);
  const matches = hubs.flatMap((hub) =>
    hub.items
      .filter((item) => !item.external && isStudioRouteActive(pathname, item.href))
      .map((item) => ({ hub, item })),
  );
  matches.sort((left, right) => right.item.href.length - left.item.href.length);
  const active = matches[0] ?? {
    hub: hubs.find((hub) => hub.id === "overview") ?? hubs[0],
    item: undefined,
  };
  return {
    hubs,
    activeHub: active.hub,
    activeItem: active.item,
  };
}
