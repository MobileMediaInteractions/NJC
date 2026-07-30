import type { StaffRole } from "@/lib/types";

export type StudioHubId =
  | "overview"
  | "editorial"
  | "distribution"
  | "communications"
  | "njc-plus"
  | "finance"
  | "control"
  | "configuration";

export type StudioNavigationContext = {
  role: StaffRole;
  chatEnabled: boolean;
  pressEnabled: boolean;
  alertsEnabled: boolean;
  financeEnabled: boolean;
};

export type StudioNavigationItem = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  roles?: readonly StaffRole[];
  requiresChat?: boolean;
  requiresPress?: boolean;
  requiresAlerts?: boolean;
  requiresFinance?: boolean;
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
      {
        id: "twenty-under-twenty",
        label: "20 Under 20",
        href: "/studio/20-under-20",
        roles: ["admin", "editor"],
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
        roles: publishingRoles,
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
      {
        id: "notification-campaigns",
        label: "Site notifications",
        href: "/studio/notifications",
        roles: publishingRoles,
        requiresAlerts: true,
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
    id: "finance",
    label: "Finance",
    description: "Revenue, reserves and reconciliation",
    items: [
      {
        id: "finance-overview",
        label: "Financial control room",
        href: "/studio/finance",
        roles: allRoles,
        requiresFinance: true,
      },
      {
        id: "finance-ledger",
        label: "General ledger",
        href: "/studio/finance/ledger",
        roles: allRoles,
        requiresFinance: true,
      },
      {
        id: "finance-reconciliation",
        label: "Reconciliation & closes",
        href: "/studio/finance/reconciliation",
        roles: allRoles,
        requiresFinance: true,
      },
      {
        id: "finance-settings",
        label: "Reserve policy",
        href: "/studio/finance/settings",
        roles: allRoles,
        requiresFinance: true,
      },
    ],
  },
  {
    id: "control",
    label: "Insights",
    description: "Audience and platform reporting",
    items: [
      {
        id: "analytics",
        label: "Analytics",
        href: "/studio/analytics",
        roles: allRoles,
      },
    ],
  },
  {
    id: "configuration",
    label: "Site configuration",
    description: "Publication-wide controls",
    items: [
      {
        id: "settings",
        label: "Configuration control room",
        href: "/studio/settings",
        roles: ["admin"],
      },
      {
        id: "legal-registry",
        label: "Legal publishing",
        href: "/studio/legal",
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
  if (item.requiresAlerts && !context.alertsEnabled) return false;
  if (item.requiresFinance && !context.financeEnabled) return false;
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
