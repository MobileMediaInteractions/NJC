export const siteConfig = {
  name: "The New Jersey Courier",
  shortName: "NJ Courier",
  tagline: "The Authoritative Voice of the Garden State",
  description:
    "Independent, county-first reporting for Middlesex County, New Jersey, with the public-service journalism that connects every town.",
  region: "Middlesex County",
  city: "New Brunswick",
  state: "New Jersey",
  coordinates: { latitude: 40.4862, longitude: -74.4518 },
  station: "Middlesex Desk",
  domain: "Automatic Vercel production URL",
  assetDomain: "Same-origin /assets",
  plannedDomain: "njcourier.com",
  plannedAssetDomain: "cdn.njcourier.com",
  launchStatus: "prelaunch",
  timezone: "America/New_York",
  primaryColor: "#173E32",
  accentColor: "#C49545",
  navigation: [
    { label: "Latest", href: "/latest" },
    { label: "Middlesex", href: "/category/middlesex" },
    { label: "Statehouse", href: "/category/statehouse" },
    { label: "Public Square", href: "/category/public-square" },
    { label: "Garden State Forum", href: "/category/opinion" },
    { label: "Gridiron & Court", href: "/category/sports" },
    { label: "Jersey Laurels", href: "/category/jersey-laurels" },
  ],
  monetization: {
    adsEnabled: false,
    membershipEnabled: false,
    donationsEnabled: false,
  },
  live: {
    enabled: false,
    label: "Courier Live",
    streamUrl: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
