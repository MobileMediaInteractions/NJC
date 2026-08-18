# `@harborline/contracts`

This package is the cross-platform source of truth for story, author, weather,
configuration, API, theme, pairing and employee-facing TypeScript contracts.
Clients import these definitions instead of maintaining platform-local copies.

![Web consumer of shared publication contracts](../../docs/screenshots/dark/web-story.jpg)

Notable behavior includes the adaptive theme contract: System plus only the
useful opposite-device override. Contract changes require compatibility review
across web, mobile, employee, Apple TV, Android TV and Roku consumers.
