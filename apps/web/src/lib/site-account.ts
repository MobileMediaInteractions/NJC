export type SiteAccountAction = {
  label: "Sign In" | "Studio" | "Profile";
  href: string;
};

const studioAccessRoles = new Set([
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
]);

export function hasStudioAccessRole(value: unknown) {
  return typeof value === "string" && studioAccessRoles.has(value);
}

export function normalizeStudioHref(value: string | undefined) {
  if (!value) {
    return "/studio";
  }

  try {
    const url = new URL(value);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

export function resolveSiteAccountAction(
  state: { signedIn: boolean; hasStudioAccess: boolean },
  studioHref = "/studio",
): SiteAccountAction {
  if (!state.signedIn) {
    return { label: "Sign In", href: "/sign-in" };
  }

  if (state.hasStudioAccess) {
    return { label: "Studio", href: studioHref };
  }

  return { label: "Profile", href: "/profile" };
}
