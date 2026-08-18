# NJ Courier TODO

This file tracks known follow-up work. Items here are requirements, not claims that the feature is already implemented.

> Documentation baseline (August 18, 2026): every pnpm application, package,
> tool and investigation workspace now has an owning README; all 99 human-facing
> `apps/web` page files are mapped in `apps/web/PAGES.md`; and 49 dark-mode or
> safe-boundary captures are indexed under `docs/screenshots/dark`. Protected
> interiors remain represented by their signed-out boundary, and real-device
> store/certification captures remain part of the existing mobile, TV and Roku
> validation work below rather than being simulated with private or fake data.

## Mandatory first implementation — remaining analytics v2 production validation

> The ground-up code/documentation rebuild, production migration, protected
> reconciliation control, database-backed transaction suite, shared ranges and
> permission-controlled version drill-down are complete. The figures must remain
> **provisional** until the signed-in and real-device checks below are completed.
> See
> [the audit report](docs/analytics/AUDIT_2026-07-30.md),
> [measurement dictionary](docs/analytics/MEASUREMENT_DICTIONARY.md) and
> [rollout procedure](docs/analytics/ROLL_OUT.md).

- [ ] Sign into production Studio as an administrator/editor, open
  **Analytics → Audit**, run **Production reconciliation**, attach its grouped,
  privacy-safe counts to
  `docs/analytics/PRODUCTION_VALIDATION_2026-08-01.md`, and resolve any
  event-to-aggregate mismatch before trusting the v2 totals. The migration and
  deployment are current; this protected query remains because production
  credentials are intentionally non-exportable.
- [ ] Complete the real production control with two approved test accounts,
  separate browser profiles, anonymous and authenticated browsing, a linked
  Roku installation upgraded across two builds, and a second distinct Roku
  installation. Reconcile the dashboard, CSV evidence and the first closed
  weekly/monthly/yearly archives by hand.
- [ ] Verify the signed-in Studio workspace at 1440×900 and 1920×1080 on the
  production deployment. Confirm there is no page, panel, table or nested
  scrollbar, no clipped control, and no unreadably reduced text at normal zoom.
- [ ] Obtain product and editorial approval for the measurement dictionary and
  record the production baseline/reset decision. Set
  `ANALYTICS_V2_BASELINE_APPROVED=true` only after this approval and every
  preceding production check passes; do not bypass a reconciliation or
  application-identity warning merely to remove the provisional badge.

## Mandatory second product implementation — remaining production validation

> The pseudonym/byline system, approval-gated publishing state machine, durable
> scheduling queue, typed Studio configuration registry, production migrations,
> portable backup support, and code-level verification are implemented and
> deployed. Completed work has been removed from this TODO. Operational details live in
> [Pseudonyms and public bylines](docs/editorial/PSEUDONYMS_AND_BYLINES.md),
> [Approval and scheduled publication](docs/editorial/APPROVAL_AND_SCHEDULING.md),
> and the [Studio configuration registry](docs/operations/CONFIGURATION_REGISTRY.md).

- [ ] Run a production-like newsroom rehearsal with separate author, approver,
  and publisher accounts: Draft → Review → approval → scheduled → Published;
  then verify material-edit invalidation, cancellation, rescheduling, overdue
  recovery, failed/blocked visibility, pseudonym moderation, collaborative
  bylines, and an audited historical correction.
- [ ] Add database-backed concurrency and browser E2E coverage for competing
  approvals/workers/configuration saves, rollback, every supported Studio role,
  and scheduled publication around a real daylight-saving transition. The
  completed unit, type, lint, and production-build checks do not replace these
  environment-backed tests.
- [ ] Verify the versioned configuration and platform overrides on deployed
  web, iOS, Android, employee, Apple TV, Android TV, Roku, NJC+, CDN, developer
  API, and Studio NJ Dev clients, including enabled, disabled, stale, and
  unavailable states on real devices where applicable.

## NJC+ The Courier Cut and playback composition — production validation remaining

> The shared millisecond source-timeline schema, visual Studio editor, player
> skip lifecycle, global original-content intro inheritance/opt-out, 2.5-second
> transition, private Courier Cut invitations, expiration/revocation,
> viewing state, structured feedback, private Blob upload/proxy, release flag,
> invitation-aware NJC+ tab, dedicated non-indexed invite portal, enforced
> NJC+-only or NJC+-plus-subdomain distribution modes, host routing, migration
> and unit tests are implemented. A Courier-Cut-only state is deliberately
> impossible. Operating details and explicit
> media limitations live in
> [NJC+ timeline, platform intro and The Courier Cut](docs/NJC_PLUS_PREVIEW_TIMELINE.md).

- [ ] Apply migration `0038` in production, confirm the separate private Blob
  store is configured, enable `njc_plus_preview_club` only after a security
  review, and rehearse invite, future start, expiration, revocation, guessed
  URL, range request, feedback update and private-to-public release transition
  with two real Clerk accounts. Confirm disabled or unauthorized requests fail
  as not found and never reveal a Blob pathname or URL.
- [ ] Attach `cut.thejerseycourier.com` to the fixed `njc-web` Vercel project,
  add the exact provider-issued CNAME at IONOS, wait for managed TLS, and verify
  the non-indexed invite portal. Add the exact production host and return URL
  to Clerk's permitted origins/redirects without using a wildcard. With two
  real invited accounts, test the
  default **NJC+ only** mode and **NJC+ and The Courier Cut** mode, including
  direct/guessed slugs, sign-out, invitation expiration/revocation and switching
  back to NJC+ only. Confirm no Studio or API control can produce host-only
  content.
- [ ] Validate the visual timeline and composed web player with real encoded
  assets in Chrome, Safari, Firefox, iOS Safari and Android Chrome: multiple
  markers, overlapping warnings, backward seeks, refresh/resume, fullscreen,
  captions, intro failure, missing intro, gap timing and a changed global intro
  duration. Record measured transition behavior before public release.
- [ ] Select and integrate a transcoding/streaming provider before claiming
  seamless adaptive-streaming composition. Generate compatible HLS/DASH
  renditions and composed manifests while retaining source-relative markers;
  verify captions, alternate audio, quality switching and next-episode behavior.
  The current one-element Blob source switch is intentionally non-destructive
  but is not represented as manifest-level gapless stitching.
- [ ] Implement and verify the versioned presentation payload in the iOS,
  Android, Apple TV, Android TV and Roku players. Until each real-device suite
  passes, those clients must not claim timeline/global-intro/Courier Cut parity.

## Press & Media portal — external DNS, operations and counsel approval remaining

> The dedicated `press.thejerseycourier.com` application surface, legacy
> `/press` transition, structured AI intake with deterministic fallback,
> versioned policy engine, allowlisted asset catalog, human review, audited
> lifecycle, request-specific PDF/manifest, private token-bound ZIP delivery,
> Studio controls, transactional-email adapter, migration, portable backup and
> security tests are implemented. Studio now has an exact-version legal
> readiness gate; it deliberately remains provisional until qualified reviewers
> supply every required decision. See
> [the Press & Media runbook](docs/PRESS_KIT_PORTAL.md) and
> [external activation/legal validation](docs/PRESS_LEGAL_VALIDATION.md).

- [ ] Run a production portable backup/restore rehearsal and confirm every
  restored Press request token and package token is revoked. Migration `0036`,
  separate production/preview token peppers, private Vercel Blob, and durable
  KV rate limiting are configured in production.
- [x] Activate `press.thejerseycourier.com` with the authoritative IONOS CNAME
  `637644a6ea56a9c4.vercel-dns-017.com.`, a Vercel-managed TLS certificate and
  the existing production Press host routing. Public DNS, HTTPS and the
  dedicated portal were verified on August 11, 2026. Keep the canonical,
  no-index API, legacy `/press`, secure-download, raw Vercel alias,
  preview-deployment and cross-request authorization matrix in every release
  rehearsal.
- [ ] Decide whether to enable the existing Cloudflare Workers AI credentials
  for intake extraction. If enabled, use a least-privilege token and the
  configured free model, validate provider retention/data-use terms, and prove
  malformed JSON, outage, timeout and prompt-injection cases fall back or route
  to staff without releasing an asset.
- [ ] Configure a verified, monitored sender and press contact if transactional
  email is wanted. Test receipt, more-information, manual-review, approval,
  partial approval, denial, ready, expiration and revocation delivery; missing
  or failed email must never change the authorization result.
- [ ] Have qualified counsel approve the operating entity, monitored contacts,
  final privacy retention periods, license/authorization copy, jurisdiction,
  attribution rules, revocation effect and every automatic/manual use mapping.
  Until that approval exists, retain the generated legal-review warning and do
  not expand the versioned repository-derived media rights.
- [ ] Complete a production rehearsal for the documented journalist, reviewer,
  missing-organization, unclear-use, prohibited, partial, nonexistent-asset,
  injection, duplicate, expired, guessed-package, staff-override and revocation
  cases. Inspect each PDF and ZIP and prove its manifest contains exactly the
  approved IDs, versions, hashes and restrictions—never a private path or
  unapproved file.

## Domain operations — production activation remaining

> The repository now has one typed hostname registry and a locked Studio
> **Settings → Domain control** surface. Generic provisioning is limited to
> pre-approved web hostnames, the exact production Studio host, an active
> administrator on an explicit server-side operator allowlist, a signed
> five-minute preview, an exact hostname confirmation, a substantial reason,
> durable audit storage and a fixed Vercel project. It cannot delete domains,
> edit arbitrary DNS, expose provider credentials, provision the CDN/status
> projects, or publish the `int` security boundary. See
> [the domain-control runbook](docs/operations/DOMAIN_CONTROL.md).

> Vercel attachment, authoritative IONOS CNAMEs, managed TLS and public HTTPS
> verification are complete for `press`, `distribution`, `links`, `support`,
> `careers`, `events`, `live`, `weather`, `newsletters`, `ads`, and `account`.
> `links` now serves the first-party, Studio-curated Link in Bio surface with
> published-story-only redirects, social attribution, availability windows,
> click counts and audited controls. The remaining reserved web hosts redirect
> to the canonical publication until a reviewed first-party surface replaces
> each redirect. `int` remains DNS-dark.

- [ ] After the current domain batch is attached and its authoritative CNAMEs
  are verified, configure the production control with a dedicated
  least-privilege Vercel token, optional IONOS Cloud DNS token/zone, an
  independently generated challenge secret and the exact Clerk IDs of the
  approved infrastructure operators. Keep `DOMAIN_CONTROL_ENABLED=false`
  until provider scope, audit retention, token rotation and recovery have been
  reviewed; then perform one monitored idempotent activation and one denied
  non-operator rehearsal before enabling ordinary use.
- [ ] Keep the registry current whenever a hostname changes purpose, project,
  activation state or owner. Reserved hosts must redirect to the canonical
  publication until their first-party surface is approved. `status` must use
  an independent failure-domain service, and `int` must remain DNS-dark until
  every connection-level perimeter requirement below is complete.

## Independent Status service — external activation and operations remaining

> The dedicated `apps/status` service, complete managed-hostname catalog,
> contract-aware live checks, self-health and machine-readable APIs,
> responsive light/dark/system interface, issue summary, honest 90-day tick
> lines, optional aggregate Redis history, security headers and tests are
> implemented. It remains separate from `njc-web` by design. See
> [the Status runbook](docs/operations/STATUS_SERVICE.md).

- [x] Create, Git-connect and production-deploy the independent `njc-status`
  Vercel project, verify its provider-protected `/api/health` and `/api/status`
  responses, and attach `status.thejerseycourier.com`. The project uses
  `apps/status`, the same repository and production branch `main` without
  sharing the `njc-web` failure domain.
- [x] At IONOS, add the exact Vercel-recommended CNAME `status` →
  `41e5f6338ab579af.vercel-dns-017.com.`, issue independent managed TLS and
  verify the public page and `/api/health`. The DNS, certificate and live
  endpoint checks passed on August 11, 2026. A controlled `njc-web` outage or
  blocked-origin rehearsal remains part of disaster-recovery validation.
- [ ] Provision a separate free-compatible Upstash Redis for retained status
  history, configure only `STATUS_REDIS_REST_URL` and
  `STATUS_REDIS_REST_TOKEN`, then activate an independent collector at the
  reviewed interval. Confirm every green/degraded/red/gray tick comes from a
  retained sample and that the five-minute global bucket prevents duplicates.
- [ ] Add an audited incident and maintenance authoring workflow, component
  selection, public incident updates, resolution timestamps and optional
  subscriber notifications before claiming those capabilities. Do not place
  incident control in the public app or make it depend exclusively on the
  service currently experiencing an outage.

## Mandatory third product implementation — external perimeter, enrollment and staged migration remaining

> The repository-wide inventory, 1,304-file ownership/sensitivity register,
> 269-route and 110-table classification, scope decision, provider comparison,
> free-compatible Access+mTLS design, separate disabled Next.js application,
> exact-host/origin-proof/Access-JWT/Clerk/active-user/explicit-grant checks,
> self-service exclusion, security headers and CI enforcement are complete.
> `int.thejerseycourier.com` intentionally has no DNS record or deployment yet:
> publishing it before its connection-level perimeter exists would violate the
> requirement. See [the boundary design](docs/security/INTERNAL_BOUNDARY.md),
> [human register](docs/security/INTERNAL_BOUNDARY_REGISTER.md) and
> [machine register](docs/security/INTERNAL_BOUNDARY_ROUTES.json).

- [ ] Activate and prove the selected connection-level perimeter before creating
  DNS or deploying the internal Vercel project.
  - Create the publication-owned Cloudflare Zero Trust Free organization,
    identity provider, whole-host Access application, private CA and required
    mTLS rule. Issue unique expiring client certificates only to enrolled
    devices; never commit or share the CA private key.
  - Configure Cloudflare to replace the private origin-proof header, create the
    separate Vercel project with Standard Protection for aliases/previews, set
    exact issuer/AUD/origin secrets, and enable the app only after every
    prerequisite is present.
  - Choose public DNS for outside-network convenience or WARP/private DNS if
    the hostname itself must remain undiscoverable. Record the accepted
    certificate-transparency, free-tier log-retention and outage limitations.
- [ ] Build the administrator-controlled enrollment, eligibility and revocation
  workflow for the small set of people permitted to connect.
  - Support approved outside access through a controlled account/device enrollment flow with start, expiration, revocation, reviewer, reason and audit history.
  - Keep `internal:access` out of broad role defaults and generic employee
    self-service. Grant it only after the matching device certificate has been
    enrolled and reviewed.
  - Re-check eligibility at the perimeter and server on every session and privileged request. Revoked, expired, disabled or role-changed accounts must lose access promptly.
  - Provide least-privilege sections and action-level capabilities so internal-host access does not automatically grant role management, exports, licensing, private chat or other sensitive tools.
  - Define secure recovery and tightly audited break-glass access without a shared password, permanent bypass, secret URL or client-editable claim.
- [ ] Extend the implemented defense-in-depth shell to each migrated workflow.
  - Validate authentication, active account state, capability, resource access and action permission on the server for every internal page, API, attachment, export, live subscription, notification and deep-link destination.
  - Never trust a role, target ID, host, origin, forwarded header, account search result or destination supplied by a client.
  - Preserve the exact-host, private-origin-proof and signed Access-JWT checks;
    ensure no migrated route/API can be reached through the canonical publication,
    `studio`, `api`, `plus`, CDN, raw `*.vercel.app` deployment URL, a preview
    URL, alternate rewrite or forged host/forwarded-host header.
  - Protect or disable preview and branch deployments that would otherwise expose the internal application outside the private-access perimeter.
  - Prevent insecure direct-object references, guessed channel membership, unauthorized private attachments, export enumeration and cross-role data leakage.
  - Keep private media and exports in authorization-checked storage; do not serve them from the public CDN or publish durable unauthenticated Blob URLs.
  - Rate-limit sensitive actions, redact secrets and private content from errors or logs, sanitize user content, apply restrictive security headers and audit every privileged read or mutation that warrants accountability.
  - Do not use obscurity, `robots.txt`, `noindex`, an unlinked hostname or an unfamiliar error page as an access control.
- [ ] Define the internal service’s deployment, network and data operations before migration.
  - Map which existing Vercel project, database, private Blob store, Redis/KV service, Clerk instance and environment variables it may use, and give the internal deployment only the secrets it needs.
  - Separate public and internal API origins where needed, while preserving a versioned shared contract for the employee mobile app and other authorized clients.
  - Decide how employee mobile clients, Studio NJ Dev, automation and service-to-service jobs authenticate without weakening the human browser boundary.
  - Document DNS, TLS/certificate-transparency implications, private-access configuration, disaster recovery, portable exports, secret rotation, access-provider outage behavior and rollback to the existing protected surfaces.
  - Preserve existing public publishing, employee chat, mobile/TV clients, device pairing, NJC+, API developers, CDN delivery and Studio operations throughout a staged migration.
- [ ] Add an adversarial verification matrix and require it to pass before the internal hostname is considered available.
  - Cover authorized, signed-out, authenticated-but-unauthorized, revoked, expired, disabled, wrong-role, wrong-capability and unenrolled-device cases from both inside and outside the approved network path.
  - Test the `int` hostname, every internal path and API, static assets, uploads/downloads, deep links, notification links, raw deployment aliases, previews, public-host path aliases, malformed hosts and direct resource URLs.
  - Confirm denied users receive no application response, redirect target, internal title, route name, resource metadata, timing distinction or useful existence signal beyond the unavoidable behavior of the selected network layer.
  - Confirm authorized external users can connect, authenticate, resume an intended destination and use only their granted sections and actions.
  - Add automated authorization, host-routing and regression tests plus manual tests from real external networks and devices. Record evidence, limitations and any unavoidable metadata exposure.
  - Complete security review, incident-response documentation and a reversible production rollout before removing any older protected entry point.

## Mobile PWA — real-device release validation remaining

> The public site now has a production-only service-worker lifecycle shared
> safely with web push, bounded public-page and static-asset caches, a branded
> offline fallback, a complete standalone manifest, install and maskable icons,
> iOS installation guidance, safe-area handling, mobile-native navigation and
> active-route feedback. Completed implementation work has been removed from
> this TODO; operating details live in [the PWA runbook](docs/PWA.md).

- [ ] After the production deployment, install and accept the PWA on current
  iPhone/Safari and Android/Chrome hardware, plus a notched small phone and a
  tablet. Verify the Courier icon, launch appearance, standalone mode, manifest
  shortcuts, sticky header, bottom dock, light/dark/system themes, orientation,
  virtual keyboard, browser back behavior, account destination and every
  safe-area inset without clipped or unreachable controls.
- [ ] Complete a production offline/update rehearsal: visit several stories,
  remove the connection, confirm visited coverage remains readable and unseen
  coverage uses the branded fallback, reconnect, publish an update and verify
  the new service worker takes over cleanly. Confirm push subscriptions and
  notification routing still work through the shared worker, private/account
  routes never enter Cache Storage, and clearing site data returns the reader
  to a clean first-install state.
- [ ] Run production installability, accessibility and Core Web Vitals checks
  at representative mobile breakpoints. Resolve any tap-target, focus-order,
  text-scaling, layout-shift or contrast regression before treating the PWA as
  store-quality, and record the accepted device/browser matrix in this section.

## Roku — highest platform priority after the mandatory implementations

- [ ] Accept the ground-up custom Roku redesign on representative real hardware. The implemented SceneGraph interface now uses NJ Courier's editorial direction, custom focus/navigation components, configuration-driven sections, explicit loading/error/empty states and a modal remote-controlled article reader rather than stock Roku templates.
  - Preserve the original product direction during acceptance: “If Netflix can get a design like that, we need to get a full matched UI/UX as the site itself. It needs to look like Roku got a browser and we just took the site and went *plop*.” Use Netflix only as the television-quality benchmark; the visual system and layouts must remain original to NJ Courier.
  - Profile launch, navigation, memory, image loading and input latency on at least one lower-powered and one current Roku. Record measurable budgets and correct any stutter, dropped focus events, delayed input or crashes found on hardware.
  - Review the interface at 720p, 1080p and 4K for overscan, safe areas, long-distance type size, contrast, focus visibility and supported accessibility labels.
  - Exercise unusually long headlines, long-form and image-free stories, sparse feeds, live video and weather. Confirm Up/Down and Rewind/Fast Forward paginate the article, the scroll indicator is truthful, the background cannot receive remote events, and Back restores the selected story.
- [ ] Complete production-behavior rehearsals on physical Roku hardware.
  - Change supported navigation visibility, labels, ordering, Live and Weather in Studio and confirm the validated configuration reaches Roku without reinstalling; disconnect the network and verify the last-known-good configuration and retry states.
  - Publish, update and delete stories and confirm bounded refresh behavior without reinstalling the channel.
  - Restart the channel after pairing, confirm the account persists and Connect remains hidden, then revoke/expire the session and confirm the public state returns safely.
  - Re-check Roku Channel Store authentication requirements, final screenshots, privacy disclosures, content ratings, streaming rights and the complete certification device matrix.

## Secure QR and code pairing — real-device production validation remaining

- [ ] Run the completed 60-second, single-use pairing state machine end to end on production-backed web quick sign-in, iOS, Android, Apple TV, Android TV/Google TV and Roku.
  - Capture evidence for code rotation before scan; atomic `pending → processing`; frozen and obscured QR with progress indicator; matching-account approval; explicit denial; processing timeout; competing/duplicate scan rejection; five-second full-screen success; and restoration of the exact prior destination or closest safe fallback.
  - Test network loss, verifier cancellation, app/channel restart, replay, expired codes, revoked accounts and expired device sessions. Confirm no raw secret, claim nonce, sign-in ticket or device token appears in client-visible errors, analytics or logs.
  - Run the new database migration in every deployment environment before testing and verify legacy unfinished requests expire rather than becoming claimable.

## Newsroom and publishing

- [ ] Verify the streamlined **Stories** workspace against production data on
  phone, tablet, 1440×900 and 1920×1080 displays: **Active** must include
  unfinished newsroom work and published stories explicitly marked active,
  while excluding final published and archived stories; every tab count must
  remain accurate, lifetime and seven-day view totals must reconcile with
  Analytics v2, long headlines/bylines must wrap, and there must be no
  horizontal or nested scrollbar. Normal page-level vertical scrolling is
  allowed only when the number of stories exceeds the viewport.
- [ ] Run the protected rich-story-editor acceptance matrix in production with
  separate author and approver accounts: open a completely blank **New story**
  without a runtime error, create and reload a formatted draft,
  exercise Visual/Text plus Write/Split/Preview, recover an intentionally
  unsaved browser draft, and confirm an unchanged save creates no revision.
  Compare consecutive and non-consecutive revisions in unified and side-by-side
  layouts, use **Changes since published**, inspect word-level, metadata and
  lead-media changes, restore an older draft as a new revision, and restore an
  active published version through independent approval. Then publish and
  verify the public reader presentation plus the portable plain-copy API
  fallback. Repeat with the global feature disabled and each configured default
  mode; this local checkout intentionally cannot bypass its missing Clerk
  credentials. See
  [Rich story editor](docs/editorial/RICH_STORY_EDITOR.md).
- [ ] Add native structured-rich-story renderers to iOS, Android, Apple TV,
  Android TV and Roku after their presentation contracts are approved. Until
  then those clients must continue using the generated portable paragraph
  fallback rather than parsing or displaying untrusted rich-editor JSON.
- [ ] Redesign Studio’s **Users & roles** directory with role-based tabs for All accounts, Readers, Contributors, Reporters, Producers, Editors and Administrators, with Alpha and Beta filters added when release-channel management is implemented.
  - Find and implement a reliable server-side filtering and counting approach that covers the complete Clerk directory, not only the 25 accounts loaded on the current page.
  - Each tab must show an accurate total, retain search and pagination, and update immediately after an administrator changes a role.
  - Keep account status, presence, platform, last-active time and security indicators visible without turning the directory into an unreadable table.
  - Audit release-channel changes with the same rigor already used for profile and role changes.
  - Add production tests proving that accounts cannot disappear between tabs, role changes cannot be forged by the client and reader accounts remain visible.
- [ ] Add reviewer notes and a clear reason when a story is returned to draft.
- [ ] Finish the Studio media library: browse, search, reuse, replace, caption, credit and safely delete unreferenced assets.
- [ ] Activate and accept the implemented AI story-image placeholder workflow in production: create a least-privilege Cloudflare Workers AI token on the free plan, add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_WORKERS_AI_TOKEN` to Vercel, enable the versioned Studio switch, approve a written synthetic-imagery policy, and complete every fail-closed generation/replacement/publication check in `docs/editorial/AI_IMAGE_PLACEHOLDERS.md`. Do not remove the publication blocker or enable paid overflow.
- [ ] Add editorial presentation previews for mobile, Apple TV, Android TV and Roku.
- [ ] Add end-to-end tests covering create → image upload → review → return → revise → publish → update → delete.

## Reliability, security and operations

- [ ] Add production error monitoring and alerts for failed publishing, media uploads, authentication, pairing, database operations and public API requests.
- [ ] Add a documented restore drill that proves a portable database and media export can rebuild the platform in a separate account.
- [ ] Review retention, deletion and audit-log policies before accepting real employee, reader or advertiser data.
- [ ] Run periodic accessibility, performance, broken-link, SEO and security checks against production.
- [ ] Complete release signing, store credentials, notification credentials and real-device regression testing for every mobile and television app before distribution.

## Domains and launch

- [ ] Confirm Google has refreshed the production `robots.txt`, successfully read both submitted sitemaps and made homepage indexing requests available.
- [ ] Finish final-domain launch verification for `https://www.thejerseycourier.com/`: redirects, canonical URLs, feeds, sitemaps, email links, Universal Links and Android App Links.
- [ ] Provision the optional asset CDN subdomain and switch `NEXT_PUBLIC_ASSET_ORIGIN` only after its asset manifest and fallback behavior are verified.
- [ ] Connect `thejerseycourier.com` to Google Search Console so Google can discover and index the publication.
  - Verify domain ownership using the DNS method.
  - Submit the production XML sitemap and news sitemap, and confirm robots, canonical URLs and structured news metadata use `https://www.thejerseycourier.com/`.
  - Request indexing for key launch pages and monitor indexing coverage, crawl errors, removals, Core Web Vitals and search performance.
  - Treat Search Console as an indexing and diagnostics tool; do not claim or guarantee a particular search-result ranking.
- [ ] Replace remaining placeholder contact, legal-entity, newsroom and distribution details after those decisions are finalized.
- [ ] Complete a launch-day checklist covering rollback, incident response, editorial escalation, backups and status communication.

## Measurement and advertising — external activation remaining

- [ ] Create or connect the publication’s GA4 property, approve its retention and internal-traffic settings, enter the real `G-…` measurement ID in Studio, and validate the consent-gated production events.
- [ ] Create and approve the external AdSense account, register the production domain, configure a Google-certified consent message, create ad units, review Google’s site approval, then enter the real publisher and slot IDs in Studio before disabling Preview mode.
- [ ] After live inventory is approved, validate consent withdrawal, reporting, fill failures, accessibility, layout shift, Core Web Vitals, placement policy compliance and reasonable ad density on real desktop and mobile pages.
- [ ] Move the monetized production deployment to a hosting plan or provider whose terms permit commercial use; Vercel Hobby is for personal, non-commercial use.

## Finance and payments — external activation remaining

> The code-backed Finance hub, hosted Stripe checkout, billing portal,
> duplicate-safe webhook register, settlement subledger, reserve planning,
> CSV/portable exports and versioned period-close workflow are implemented.
> Complete this operational work before accepting real money. See
> [the finance and payments runbook](docs/FINANCE_AND_PAYMENTS.md).

- [ ] Apply `apps/web/drizzle/0026_first_doomsday.sql` to production, configure
  Stripe test-mode secrets and every documented signed webhook event, then
  prove successful, declined, action-required, renewal, cancellation, refund,
  dispute and failed-payout scenarios end to end.
- [ ] Choose the legal entity, accounting method, chart of accounts, bank
  destination, payroll process and bookkeeping system with qualified
  professionals. Reconcile Studio’s subledger to Stripe Balance/Payout reports
  and bank statements; do not treat Studio as a filed return or full
  double-entry accounting system.
- [ ] Determine NJC+ sales-tax registrations, nexus, product tax codes and
  customer-location evidence before setting `STRIPE_TAX_ENABLED=true`.
  Validate collection, refund and remittance behavior in test mode and obtain
  professional approval.
- [ ] Have the publication’s CPA or tax adviser approve the federal, New Jersey,
  payroll, contingency, chargeback and operating-reserve policy in Studio. Zero
  remains the safe default until that review is complete.
- [ ] Configure and legally review the Stripe Customer Portal, prices,
  trial/renewal disclosures, refund/cancellation policy, privacy terms,
  statement descriptor, receipts and support contact before live checkout.
- [ ] Close and independently review a production-like test month, compare the
  CSV and encrypted portable backup, and perform a restore/reconciliation drill
  before moving Stripe Products, Prices and credentials to live mode.
