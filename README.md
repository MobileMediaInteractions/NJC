# Harborline Local

Harborline Local is a production-oriented, fictional local-news network built with Next.js, Expo, React Native and TypeScript for the Vercel platform. It includes a public news product, role-aware newsroom CMS, one iOS/Android codebase, a dedicated Apple TV app, portable encrypted backups, a self-service developer platform and a versioned API.

## Product surfaces

- Broadcast-style, responsive public homepage and category desks
- Long-form story pages with metadata, sharing, tags and related coverage
- Weather, watch, live stream, search, newsletters and service pages
- Newsroom Studio with dashboard, workflow queue, story editor, media, analytics, staff roles and settings
- Roles: admin, editor, producer, reporter and contributor
- Workflow: idea, assigned, draft, review, scheduled, published and archived
- Versioned `/api/v1` contracts documented in `docs/MOBILE_API.md`
- Expo SDK 57 app with offline feeds, bookmarks, weather, live video, push alerts and limited mobile newsroom controls
- Apple TV client built on `react-native-tvos`, with remote focus states and secure QR/code activation
- Two-way device pairing: approve TV at `/login/tv`, or sign a browser in from mobile at `/login/quick`
- Verified developer accounts with scoped HMAC-hashed keys, audit records, revocation and Upstash rate limits
- Consent-aware audience reporting with Web, iOS, Android, Apple TV and developer API totals in Studio and mobile admin
- Legal/trust center, consent controls and verified privacy-request intake foundation
- Provider-neutral Postgres, Blob, migration and configuration exports documented in `docs/PORTABLE_BACKUP.md`

## Platform

- Next.js App Router + TypeScript
- Vercel deployment and Cron Jobs
- Neon Postgres + Drizzle ORM
- Vercel Blob for newsroom media
- Clerk for staff authentication
- Upstash Redis for developer API rate limits
- Expo/EAS for one iOS/Android mobile codebase and a focused tvOS target
- shadcn/ui + Tailwind CSS

## Local preview

The public site runs with realistic seeded content even before services are connected.

```bash
pnpm install
pnpm dev
```

To review Studio locally without configuring authentication, use the explicit development-only flag:

```bash
CMS_DEMO_MODE=true pnpm dev
```

This bypass is ignored in production.

The mobile app is in `apps/mobile`:

```bash
pnpm mobile:start
pnpm mobile:check
```

The Apple TV app is in `apps/tv`:

```bash
pnpm tv:start
pnpm tv:check
```

See `docs/TV_PAIRING.md` for the tvOS build and secure activation model.

## Vercel setup order

1. Create or link the Vercel project.
2. Install Neon, Clerk and Vercel Blob from the Vercel Marketplace/dashboard.
3. Add `CRON_SECRET`, `API_KEY_PEPPER`, a separate `DEVICE_PAIRING_PEPPER`, Upstash Redis values and any optional newsletter/analytics values.
4. Pull the project environment into `.env.local`.
5. Run `pnpm db:migrate` followed by `pnpm db:seed`.
6. Deploy a preview, verify it, then promote the same artifact to production.
7. Create the mobile and TV EAS projects, replace both placeholder project IDs, configure APNs/FCM and add the deployed API URL to app builds.

Copy `.env.example` for the required key names. Never commit `.env.local`.

The scheduled-publishing cron runs every five minutes and therefore requires a Vercel plan that supports sub-daily schedules. Change the cron cadence if deploying on a different plan.

## Replace the fictional launch identity

Most launch identity, region and module switches are centralized in `src/lib/site.ts`. Replace the seed reporting in `src/lib/seed.ts`, update the social image and legal copy, then connect the real service credentials.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm mobile:check
pnpm tv:check
```
