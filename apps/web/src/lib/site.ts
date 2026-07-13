export const siteConfig = {
  name: "Harborline Local",
  shortName: "Harborline",
  tagline: "The coast, clearly reported.",
  description:
    "Independent local reporting for the fictional Harbor County region, from the waterfront to the west hills.",
  region: "Harbor County",
  city: "Port Alder",
  state: "Maine",
  coordinates: { latitude: 43.6591, longitude: -70.2568 },
  station: "HLN 8",
  timezone: "America/New_York",
  primaryColor: "#0a4b78",
  accentColor: "#f5b335",
  navigation: [
    { label: "Latest", href: "/latest" },
    { label: "Local", href: "/category/local" },
    { label: "Weather", href: "/weather" },
    { label: "Watch", href: "/watch" },
    { label: "Investigates", href: "/category/investigates" },
    { label: "Sports", href: "/category/sports" },
    { label: "Things to Do", href: "/category/culture" },
  ],
  social: {
    instagram: "#",
    youtube: "#",
    facebook: "#",
  },
  monetization: {
    adsEnabled: false,
    membershipEnabled: false,
    donationsEnabled: false,
  },
  live: {
    enabled: true,
    label: "Harborline Now",
    streamUrl: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
