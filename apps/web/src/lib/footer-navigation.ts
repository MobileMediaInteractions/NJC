import type { SiteConfiguration } from "@/lib/site-settings";

export type FooterLink = readonly [label: string, href: string];
export function footerNavigation(features: SiteConfiguration["features"], staffPageEnabled: boolean) {
  const primary: FooterLink[] = [["Latest", "/latest"], ...(features.community ? [["In the Community", "/community"] as const] : []), ["News tips", "/tips"], ...(features.newsletters ? [["Newsletters", "/newsletter"] as const] : [])];
  const groups: Array<{ title: string; links: FooterLink[] }> = [
    { title: "News & views", links: [["Middlesex", "/category/middlesex"], ["Statehouse", "/category/statehouse"], ["Courier Watch", "/category/investigates"], ["Gridiron & Court", "/category/sports"], ["Garden State Forum", "/category/opinion"]] },
    { title: "Get involved", links: [["20 Under 20", "/20-under-20"], ["Weekly Pulse", "/category/public-square"], ["Jersey Laurels", "/category/jersey-laurels"], ["Developers", "/developers"]] },
    { title: "The Courier", links: [["About us", "/about"], ...(staffPageEnabled ? [["Our staff", "/staff"] as const] : []), ["Our standards", "/standards"], ["Press kit", "/press"], ["Accessibility", "/accessibility"], ["Legal center", "/legal"], ["Data requests", "/data-requests"]] },
  ];
  return { primary, groups };
}
