# Analytics v2 production validation — 2026-08-01

This record distinguishes completed engineering evidence from the remaining
real-person, real-device and approval work. Analytics stays **provisional**
until the final controlled production exercise and product/editorial sign-off.

## Completed engineering evidence

- Migration `0024_clear_viper.sql` is part of the production build migration
  chain and labels unverifiable historical rows as legacy.
- Production reconciliation is available inside authenticated Studio without
  exporting the production database credential. Its grouped response contains
  no raw installation, account, session or referrer identifiers.
- Application-version groups have an administrator/editor-only evidence
  drill-down with keyed pseudonyms and paginated results.
- Content, Acquisition and Platforms share a persistent 7-day, 30-day or
  all-time selector with an explicit reset.
- Local typecheck, lint, the complete executable unit/contract suite and the
  optimized Next.js production build pass.
- Application CI provisions disposable PostgreSQL 17 for transaction-level
  analytics integration tests. Local environments without
  `ANALYTICS_TEST_DATABASE_URL` explicitly skip those tests rather than silently
  substituting mocks.

## Recorded release evidence

- GitHub application CI for commit `2437650` completed successfully, including
  the PostgreSQL-backed test suite, web typecheck/build, playground, employee,
  mobile, TV, Roku and migration-freshness checks:
  <https://github.com/MobileMediaInteractions/NJC/actions/runs/30724030398>
- Vercel production deployment `dpl_FejkXen1tSsZUXy4H5HtxqhZNdrf` reached
  **Ready** and the canonical Studio hostname serves the new protected routes.
- Signed-out requests to both production evidence endpoints return `403`,
  `Cache-Control: private, no-store, max-age=0`, and no evidence payload. This
  confirms the unauthenticated boundary without weakening the remaining
  signed-in verification requirement.

## Evidence still requiring production access or people

- Record the live reconciliation counts and resolve any mismatch.
- Complete the two-account/two-Roku controlled exercise and hand-reconcile all
  five evidence exports plus the first closed weekly, monthly and yearly
  archives.
- Obtain measurement-dictionary approval from the product and editorial owners.
  Only then set `ANALYTICS_V2_BASELINE_APPROVED=true`.
