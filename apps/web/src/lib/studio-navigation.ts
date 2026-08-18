import type { StaffRole } from "@/lib/types";
import type { StudioModuleKey } from "@/lib/site-settings";

export type StudioHubId =
  | "overview"
  | "editorial"
  | "distribution"
  | "teamspace"
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
  modules?: Record<StudioModuleKey, boolean>;
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
  module?: StudioModuleKey;
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
      {
        id: "command-reference",
        label: "Commands & shortcuts",
        href: "/studio/commands",
        roles: allRoles,
        module: "commandReference",
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
        module: "stories",
      },
      {
        id: "media",
        label: "Media library",
        href: "/studio/media",
        roles: allRoles,
        module: "media",
      },
      {
        id: "tips",
        label: "News tips",
        href: "/studio/tips",
        roles: editorialRoles,
        module: "tips",
      },
      {
        id: "twenty-under-twenty",
        label: "20 Under 20",
        href: "/studio/20-under-20",
        roles: ["admin", "editor"],
        module: "twentyUnderTwenty",
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
        module: "distributionManager",
      },
      {
        id: "press-releases",
        label: "Press releases",
        href: "/studio/press-releases",
        roles: publishingRoles,
        requiresPress: true,
        module: "pressReleases",
      },
      {
        id: "press-requests",
        label: "Press requests",
        href: "/studio/press",
        roles: publishingRoles,
        module: "pressRequests",
      },
      {
        id: "exports",
        label: "Portable exports",
        href: "/studio/exports",
        roles: allRoles,
        module: "exports",
      },
    ],
  },
  {
    id: "teamspace",
    label: "Teamspace",
    description: "Live newsroom conversation",
    items: [
      {
        id: "chat",
        label: "Team chat",
        href: "/studio/chat",
        roles: allRoles,
        requiresChat: true,
        module: "chat",
      },
    ],
  },
  {
    id: "communications",
    label: "People",
    description: "Team access and reader outreach",
    items: [
      {
        id: "team",
        label: "Team & roles",
        href: "/studio/team",
        roles: ["admin"],
        module: "team",
      },
      {
        id: "notification-campaigns",
        label: "Site notifications",
        href: "/studio/notifications",
        roles: publishingRoles,
        module: "notifications",
      },
      {
        id: "link-in-bio",
        label: "Link in Bio",
        href: "/studio/links",
        roles: publishingRoles,
        module: "linkInBio",
      },
    ],
  },
  {
    id: "njc-plus",
    label: "NJC+",
    description: "Premium network controls",
    items: [
      { id: "njc-plus-overview", label: "Overview", href: "/studio/njc-plus", roles: allRoles, module: "njcPlusOverview" },
      { id: "njc-plus-content", label: "Content", href: "/studio/njc-plus/content", roles: allRoles, module: "njcPlusContent" },
      { id: "njc-plus-intros", label: "Platform intros", href: "/studio/njc-plus/intros", roles: publishingRoles, module: "njcPlusContent" },
      { id: "njc-plus-previews", label: "Courier Cut", href: "/studio/njc-plus/previews", roles: publishingRoles, module: "njcPlusContent" },
      { id: "njc-plus-homepage", label: "Homepage", href: "/studio/njc-plus/homepage", roles: allRoles, module: "njcPlusHomepage" },
      { id: "njc-plus-commerce", label: "Tiers & offers", href: "/studio/njc-plus/commerce", roles: allRoles, module: "njcPlusCommerce" },
      { id: "njc-plus-access", label: "Access", href: "/studio/njc-plus/access", roles: allRoles, module: "njcPlusAccess" },
      { id: "njc-plus-credits", label: "Credits", href: "/studio/njc-plus/credits", roles: allRoles, module: "njcPlusCredits" },
      { id: "njc-plus-comments", label: "Comments", href: "/studio/njc-plus/comments", roles: allRoles, module: "njcPlusComments" },
      { id: "njc-plus-analytics", label: "Analytics", href: "/studio/njc-plus/analytics", roles: allRoles, module: "njcPlusAnalytics" },
      { id: "njc-plus-audit", label: "Audit log", href: "/studio/njc-plus/audit", roles: allRoles, module: "njcPlusAudit" },
      { id: "njc-plus-flags", label: "Feature flags", href: "/studio/njc-plus/flags", roles: allRoles, module: "njcPlusFlags" },
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
        module: "financeOverview",
      },
      {
        id: "finance-ledger",
        label: "General ledger",
        href: "/studio/finance/ledger",
        roles: allRoles,
        requiresFinance: true,
        module: "financeLedger",
      },
      {
        id: "finance-reconciliation",
        label: "Reconciliation & closes",
        href: "/studio/finance/reconciliation",
        roles: allRoles,
        requiresFinance: true,
        module: "financeReconciliation",
      },
      {
        id: "finance-settings",
        label: "Reserve policy",
        href: "/studio/finance/settings",
        roles: allRoles,
        requiresFinance: true,
        module: "financeSettings",
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
        module: "analytics",
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
      {
        id: "domain-control",
        label: "Domain control",
        href: "/studio/settings/domains",
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
  if (item.module && context.modules?.[item.module] === false) return false;
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
  pathname = normalizeStudioNavigationPathname(pathname);
  if (href === "/studio") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function normalizeStudioNavigationPathname(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || "/";
  const normalized =
    withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
  if (normalized === "/studio" || normalized.startsWith("/studio/")) {
    return normalized;
  }
  return normalized === "/" ? "/studio" : `/studio${normalized}`;
}

export function studioNavigationHref(href: string, cleanStudioPaths: boolean) {
  if (!cleanStudioPaths) return href;
  if (href === "/studio") return "/";
  return href.startsWith("/studio/") ? href.slice("/studio".length) : href;
}

export function usesCleanStudioNavigationPaths(pathname: string) {
  return pathname !== "/studio" && !pathname.startsWith("/studio/");
}

export function getStudioHubSecondaryItems(hub: StudioNavigationHub) {
  const defaultHref = hub.items[0]?.href;
  return hub.items.filter((item) => item.href !== defaultHref);
}

export function getStudioModuleForPathname(pathname: string) {
  const normalizedPathname = normalizeStudioNavigationPathname(pathname);
  return studioNavigationHubs
    .flatMap((hub) => hub.items)
    .filter(
      (item) =>
        item.module && isStudioRouteActive(normalizedPathname, item.href),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.module;
}

export function resolveStudioNavigation(
  pathname: string,
  context: StudioNavigationContext,
) {
  const normalizedPathname = normalizeStudioNavigationPathname(pathname);
  const hubs = getVisibleStudioNavigation(context);
  const matches = hubs.flatMap((hub) =>
    hub.items
      .filter(
        (item) =>
          !item.external &&
          isStudioRouteActive(normalizedPathname, item.href),
      )
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
