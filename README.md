# Harborline Local

Harborline Local is a production-oriented, fictional local-news network built with Next.js, TypeScript and the Vercel platform. It includes a public news product, role-aware newsroom CMS, Vercel-first persistence, media uploads, scheduled publishing, newsletters, comments and a versioned API for future iOS and Android apps.

## Product surfaces

- Broadcast-style, responsive public homepage and category desks
- Long-form story pages with metadata, sharing, tags and related coverage
- Weather, watch, live stream, search, newsletters and service pages
- Newsroom Studio with dashboard, workflow queue, story editor, media, analytics, staff roles and settings
- Roles: admin, editor, producer, reporter and contributor
- Workflow: idea, assigned, draft, review, scheduled, published and archived
- Versioned `/api/v1` contracts documented in `docs/MOBILE_API.md`

## Platform

- Next.js App Router + TypeScript
- Vercel deployment and Cron Jobs
- Neon Postgres + Drizzle ORM
- Vercel Blob for newsroom media
- Clerk for staff authentication
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

## Vercel setup order

1. Create or link the Vercel project.
2. Install Neon, Clerk and Vercel Blob from the Vercel Marketplace/dashboard.
3. Add `CRON_SECRET` and any optional newsletter/analytics values.
4. Pull the project environment into `.env.local`.
5. Run `pnpm db:migrate` followed by `pnpm db:seed`.
6. Deploy a preview, verify it, then promote the same artifact to production.

Copy `.env.example` for the required key names. Never commit `.env.local`.

The scheduled-publishing cron runs every five minutes and therefore requires a Vercel plan that supports sub-daily schedules. Change the cron cadence if deploying on a different plan.

## Replace the fictional launch identity

Most launch identity, region and module switches are centralized in `src/lib/site.ts`. Replace the seed reporting in `src/lib/seed.ts`, update the social image and legal copy, then connect the real service credentials.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
