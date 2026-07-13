import type { Story, WeatherSnapshot } from '@harborline/contracts';

const image = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1400&q=80';

export const mobileSeedStories: Story[] = [
  {
    id: 'mobile-seed-waterfront',
    slug: 'working-waterfront-resilience-plan',
    headline: 'City releases $48M working-waterfront resilience plan',
    dek: 'The proposal would reinforce piers, improve evacuation routes and protect small marine businesses from coastal flooding.',
    body: [
      'Port Alder leaders released a long-range plan Monday aimed at protecting the working waterfront while keeping it accessible to fishing crews, small businesses and the public.',
      'The fictional launch newsroom will replace this demonstration copy with verified local reporting before publication.',
    ],
    category: 'local', categoryLabel: 'Local', location: 'Port Alder',
    publishedAt: '2026-07-13T16:30:00.000Z', readingMinutes: 4,
    image, imageAlt: 'A coastal city waterfront', tags: ['waterfront', 'climate'],
    author: { id: 'harborline-desk', name: 'Harborline Newsroom', role: 'Local news desk', initials: 'HL' },
    status: 'published', isBreaking: true,
  },
  {
    id: 'mobile-seed-storm', slug: 'coastal-storm-watch-tuesday',
    headline: 'Coastal storm watch begins Tuesday at 6 a.m.',
    dek: 'Forecasters expect heavy rain, gusty winds and minor flooding near the morning high tide.',
    body: ['Emergency managers are asking residents to secure outdoor objects and avoid flood-prone roads during the morning commute.'],
    category: 'weather', categoryLabel: 'Weather', location: 'Harbor County',
    publishedAt: '2026-07-13T15:10:00.000Z', readingMinutes: 2,
    image, imageAlt: 'Clouds over a harbor', tags: ['forecast', 'storm'],
    author: { id: 'weather-desk', name: 'Harborline Weather', role: 'Weather team', initials: 'HW' },
    status: 'published', isDeveloping: true,
  },
  {
    id: 'mobile-seed-hawks', slug: 'harbor-hawks-playoff-series',
    headline: 'Harbor Hawks secure a home playoff series',
    dek: 'A late rally gave the Hawks the division’s second seed and at least two postseason games in Port Alder.',
    body: ['The Harbor Hawks closed the regular season with three straight wins and a sold-out home finale.'],
    category: 'sports', categoryLabel: 'Sports', location: 'Port Alder',
    publishedAt: '2026-07-13T13:05:00.000Z', readingMinutes: 3,
    image, imageAlt: 'Stadium lights at dusk', tags: ['sports', 'playoffs'],
    author: { id: 'sports-desk', name: 'Harborline Sports', role: 'Sports desk', initials: 'HS' },
    status: 'published',
  },
];

export const mobileSeedWeather: WeatherSnapshot = {
  location: 'Port Alder, ME', temperature: 72, feelsLike: 73, condition: 'Partly cloudy',
  high: 76, low: 61, wind: 'S 9 mph', humidity: 68,
  alert: 'Coastal storm watch Tuesday from 6 a.m. to noon.',
  hourly: [
    { time: 'Now', temperature: 72, condition: 'Partly cloudy' },
    { time: '4 PM', temperature: 74, condition: 'Mostly cloudy' },
    { time: '6 PM', temperature: 70, condition: 'Cloudy' },
    { time: '8 PM', temperature: 67, condition: 'Light rain' },
  ],
};
