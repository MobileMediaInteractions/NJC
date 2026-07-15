import type { Story, WeatherSnapshot } from "@harborline/contracts";

const image = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80";

export const mobileSeedStories: Story[] = [
  {
    id: "mobile-seed-transit",
    slug: "middlesex-transit-corridor-plan-enters-public-review",
    headline: "Middlesex transit corridor plan enters public review across five towns",
    dek: "The fictional launch-preview proposal connects bus priority, safer crossings and new station links.",
    body: ["This is fictional sample content for product demonstration and must be replaced by verified reporting before launch."],
    category: "middlesex", categoryLabel: "Middlesex County", location: "New Brunswick",
    publishedAt: "2026-07-14T17:25:00.000Z", readingMinutes: 6,
    image, imageAlt: "A regional passenger train approaching a station", tags: ["transit", "Middlesex County"],
    author: { id: "courier-desk", name: "Courier Newsroom", role: "Middlesex County desk", initials: "NJC" },
    status: "published", isDeveloping: true,
  },
  {
    id: "mobile-seed-pulse", slug: "weekly-pulse-route-9-redevelopment-priorities",
    headline: "Weekly Pulse: What should lead the next Route 9 redevelopment plan?",
    dek: "Housing, traffic safety, small businesses or open space: readers set this week’s public agenda.",
    body: ["This non-scientific poll preview stores no production vote."],
    category: "public-square", categoryLabel: "The Weekly Pulse", location: "Middlesex County",
    publishedAt: "2026-07-14T13:15:00.000Z", readingMinutes: 3,
    image, imageAlt: "A civic planning map", tags: ["poll", "Route 9"],
    author: { id: "public-square", name: "Public Square", role: "Community desk", initials: "PS" },
    status: "published", isLive: true,
  },
  {
    id: "mobile-seed-sports", slug: "vote-middlesex-player-of-the-week-opening-ballot",
    headline: "Vote: Middlesex Player of the Week opening ballot",
    dek: "The launch preview demonstrates a moderated high-school sports ballot.",
    body: ["Player information will require school confirmation and appropriate permissions before production publication."],
    category: "sports", categoryLabel: "Jersey Gridiron & Court", location: "Middlesex County",
    publishedAt: "2026-07-14T11:05:00.000Z", readingMinutes: 3,
    image, imageAlt: "Stadium lights at dusk", tags: ["high school sports", "voting"],
    author: { id: "sports-desk", name: "Courier Sports", role: "High school sports desk", initials: "CS" },
    status: "published",
  },
];

export const mobileSeedWeather: WeatherSnapshot = {
  location: "New Brunswick, NJ", temperature: 81, feelsLike: 84, condition: "Partly cloudy",
  high: 86, low: 69, wind: "SW 8 mph", humidity: 61,
  hourly: [
    { time: "Now", temperature: 81, condition: "Partly cloudy" },
    { time: "5 PM", temperature: 83, condition: "Partly cloudy" },
    { time: "7 PM", temperature: 79, condition: "Clear" },
    { time: "9 PM", temperature: 75, condition: "Clear" },
  ],
};
