# Analytics v2 rollout and correction procedure

## Migration

1. Back up Postgres and verify the portable export.
2. Apply `apps/web/drizzle/0024_clear_viper.sql`.
3. Confirm old daily views, installations and archives are labeled `legacy`.
4. Confirm archive revision 1 exists for each migrated archive.
5. Deploy the web, mobile, employee, TV and Roku producers that supply event
   IDs and complete application identity.

## Production reconciliation

Run:

```sh
pnpm analytics:audit
```

Administrators and editors can run the same grouped query from Studio's
**Analytics → Audit → Run production reconciliation** control. This is the
preferred production path when database credentials are intentionally
non-exportable. The response is private, uncached and excludes raw installation,
account, session and referrer identifiers.

The following are release-blocking failures:

- verified production page-event count differs from verified v2 aggregate
  views;
- one event ID appears more than once;
- a verified version is missing its product, channel, version or build;
- internal, preview or development data contributes to a production total;
- an upgrade creates an unexpected installation;
- a platform total cannot be reproduced from grouped source records.

Use a controlled two-account test:

1. Consent in two clean web browser profiles and sign each into a different
   approved test account.
2. Record known public-page and story navigation counts.
3. Link one account to one Roku installation on build A.
4. Upgrade that same installation to build B and report presence again.
5. Confirm two known accounts, three installations (two web plus one Roku),
   two Roku version rows and the exact page/story counts.
6. Repeat one page and presence request with the same event ID and confirm no
   total changes.
7. Run a preview request and confirm it appears only as preview evidence.
8. Export all five evidence datasets and reconcile them by hand.

The application CI job provisions disposable PostgreSQL 17 and exercises
transaction-level duplicate ingestion, late-arrival attribution, presence and
version upgrades, consent-withdrawal cascades, archive revisions, aggregate
reconciliation and pseudonymized exports. A local test run without
`ANALYTICS_TEST_DATABASE_URL` skips those integration cases by design.

## Studio validation controls

- Content, Acquisition and Platforms share one 7-day, 30-day or all-time
  selection. It remains selected when moving between those views and has a
  visible reset to the 30-day default.
- Administrator/editor users can inspect a grouped application-version row.
  The drill-down returns one-way pseudonymized installation and linked-account
  evidence, device class and operating-system class; raw Clerk and installation
  identifiers never leave the server.
- Large evidence sets are paginated instead of creating a nested scrollbar.

## Corrections

- Never update an existing archive without first inserting the next immutable
  archive revision.
- Record the correction reason, calculation version, generated time and prior
  revision.
- Do not backfill event IDs, sessions, people or verified versions into legacy
  aggregates.
- If a calculation error is found, add a new calculation version, preserve the
  old result and document the exact difference.
- Editorial and product owners must approve the new baseline before analytics
  are used in advertiser, sponsor or public audience claims.
- Keep `ANALYTICS_V2_BASELINE_APPROVED=false` during migration and
  reconciliation. Set it to `true` in production only after the recorded
  product/editorial approval; the dashboard also continues to fail provisional
  when verified events do not reconcile or application identity is incomplete.

## Rollback

Application code can stop displaying v2 figures without deleting either
ledger. Do not reverse the migration by merging legacy and verified rows.
Rollback should restore the prior application release while retaining new
tables for forensic evidence, then correct and redeploy with a higher
calculation version if necessary.
