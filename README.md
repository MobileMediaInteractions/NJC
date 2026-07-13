# Harborline Local

Harborline Local is a production-oriented, fictional local-news network built with Next.js, Expo, React Native, TypeScript and native Roku SceneGraph for the Vercel platform. It includes a public news product, role-aware newsroom CMS, one iOS/Android codebase, a shared Apple TV/Android TV codebase, a Roku app, portable encrypted backups, a self-service developer platform and a versioned API.

The repository is a Turborepo organized by target: `apps/web`, `apps/mobile`, `apps/tv` and `apps/roku`. Shared database, API-client and contract code lives under `packages`. See `docs/ARCHITECTURE.md` for boundaries and the native C/C++ policy.

## Product surfaces

- Broadcast-style, responsive public homepage and category desks
- Long-form story pages with metadata, sharing, tags and related coverage
- Weather, watch, live stream, search, newsletters and service pages
- Newsroom Studio with dashboard, workflow queue, story editor, media, analytics, staff roles and settings
- Roles: admin, editor, producer, reporter and contributor
- Workflow: idea, assigned, draft, review, scheduled, published and archived
- Versioned `/api/v1` contracts documented in `docs/MOBILE_API.md`
- Expo SDK 57 app with offline feeds, bookmarks, weather, live video, push alerts and limited mobile newsroom controls
- Shared Apple TV and Android TV/Google TV client built on `react-native-tvos`, with remote focus states and secure QR/code activation
- Native Roku SceneGraph client with story rails, weather, HLS live playback, themes and optional account linking
- Two-way device pairing: approve TV at `/login/tv`, or sign a browser in from mobile at `/login/quick`
- Verified developer accounts with scoped HMAC-hashed keys, audit records, revocation and Upstash rate limits
- Consent-aware audience reporting with Web, iOS, Android, Apple TV, Android TV, Roku and developer API totals in Studio and mobile admin
- Legal/trust center, consent controls and verified privacy-request intake foundation
- Provider-neutral Postgres, Blob, migration and configuration exports documented in `docs/PORTABLE_BACKUP.md`

## Platform

- Next.js App Router + TypeScript
- Vercel deployment and Cron Jobs
- Neon Postgres + Drizzle ORM
- Vercel Blob for newsroom media
- Clerk for staff authentication
- Upstash Redis for developer API rate limits
- Expo/EAS for one iOS/Android mobile codebase and one shared Apple TV/Android TV target
- Roku SceneGraph/BrightScript with BrighterScript validation and sideloadable ZIP packaging
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

The Apple TV and Android TV app is in `apps/tv`:

```bash
pnpm tv:start
pnpm tv:check
pnpm tv:prebuild:android
pnpm tv:android
```

See `docs/TV_PAIRING.md` for Apple TV/Android TV builds and the secure activation model.

The Roku app is in `apps/roku`:

```bash
pnpm roku:check
ROKU_API_URL=https://news.your-domain.example pnpm roku:package
```

See `apps/roku/README.md` for sideloading and Roku Channel Store requirements.

## Vercel setup order

1. Create or link the Vercel project and set its Root Directory to `apps/web`.
2. Install Neon, Clerk and Vercel Blob from the Vercel Marketplace/dashboard.
3. Add `CRON_SECRET`, `API_KEY_PEPPER`, a separate `DEVICE_PAIRING_PEPPER`, Upstash Redis values and any optional newsletter/analytics values.
4. Pull the project environment into `.env.local`.
5. Run `pnpm db:migrate` followed by `pnpm db:seed`.
6. Deploy a preview, verify it, then promote the same artifact to production.
7. Create the mobile and TV EAS projects, replace both placeholder project IDs, configure APNs/FCM and add the deployed API URL to Apple TV and Android TV builds.
8. Package Roku with the same public HTTPS origin, sideload it to physical devices and complete Roku certification assets and testing.

Copy `apps/web/.env.example` for the required key names. Never commit `.env.local`.

The scheduled-publishing cron runs every five minutes and therefore requires a Vercel plan that supports sub-daily schedules. Change the cron cadence if deploying on a different plan.

## Replace the fictional launch identity

Most launch identity, region and module switches are centralized in `apps/web/src/lib/site.ts`. Replace the seed reporting in `apps/web/src/lib/seed.ts`, update the social image and legal copy, then connect the real service credentials.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm mobile:check
pnpm tv:check
pnpm roku:check
```
