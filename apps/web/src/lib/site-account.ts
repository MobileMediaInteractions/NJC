export type SiteAccountAction = {
  label: "Sign In" | "Studio" | "Profile";
  href: string;
};

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
