# NJ Courier TODO

This file tracks known follow-up work. Items here are requirements, not claims that the feature is already implemented.

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

- [ ] Set the GitHub Actions secret `NJC_CRON_SECRET` to the same value as
  Vercel `CRON_SECRET`, manually dispatch the scheduled-publication workflow,
  and confirm the authenticated worker runs successfully. Until this is done,
  the daily Vercel cron and first-reader recovery are fallbacks, not a precise
  five-minute publication service.
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

## Mandatory third product implementation — repository-wide internal boundary and `int` subdomain

> **Execution-order requirement:** Complete this entire section after the mandatory product implementation and before every platform or product item below it. The internal boundary must be designed from an exhaustive repository review, not by placing the current Studio UI behind another hostname.

- [ ] Perform and document a file-by-file, route-by-route and deployment-by-deployment security classification of the complete repository before creating the internal service.
  - Inspect every application and client: the public Next.js site and Studio, reader mobile app, employee/admin mobile app, Apple TV/Android TV app, Roku channel, CDN project and platform playground.
  - Inspect every shared package, backend service, schema, migration, API client and contract.
  - Inspect the licensed feature/animation platform, Visual Feature Composer, Studio NJ Dev desktop/Tauri application, Rust and native integrations, scripts, generated artifacts, examples and test fixtures.
  - Inspect every page, route handler, API endpoint, host rewrite, redirect, middleware/proxy matcher, authentication callback, deep link, Universal Link/App Link, WebSocket or polling path, push-notification path, cron, webhook and file-upload/download flow.
  - Inspect every database table, relationship, index, private or public Blob object, backup/export, analytics record, audit log, employee capability grant, NJC+ entitlement, platform license, API key, device-pairing record and other stored secret or identifier.
  - Inspect environment variables, Vercel configuration, GitHub Actions and other CI/CD files, build/signing/release configuration, DNS assumptions, preview deployments, direct Vercel aliases and local-development bypasses.
  - Inspect all TODO/FIXME markers, feature flags, disabled routes, placeholders, demos, playgrounds, test-only data, incomplete migrations, stale generated files and recent changes for accidentally exposed or unfinished privileged behavior.
  - Record each surface in an internal-boundary register with its owner, purpose, deployment target, callers, data sensitivity, authentication method, authorization requirement, public/internal/service-only/build-time/deprecated classification and final disposition.
  - Treat the repository itself as the source of truth. Do not assume the most complete web implementation exists on every platform, and do not move, duplicate or remove a working surface until its clients and dependencies are known.
- [ ] Use that classification to define the exact scope of `int.<configured-primary-domain>` (for the current domain, the intended form is `int.thejerseycourier.com`).
  - Evaluate Studio administration, employee chat and directory, access requests and reviews, role/capability management, internal notifications, operational tools, audit logs, analytics, exports/backups, site configuration, NJC+ administration, platform licensing administration and development/playground tooling individually.
  - Move or expose only confirmed internal workflows. Keep public editorial pages, public reader APIs, public assets and genuinely public account features outside the internal boundary.
  - Decide explicitly whether editorial Studio remains on `studio.<domain>`, moves behind `int.<domain>`, or becomes a separately permissioned area within the internal service. Do not create two conflicting sources of truth.
  - Prefer a separately deployable internal application or service boundary when that prevents privileged pages, dependencies and implementation details from entering the public web bundle. Reuse safe shared contracts and server libraries rather than copying logic.
  - Keep the hostname, canonical domain and allowed internal origins configuration-driven so a later domain or hosting migration does not require rewriting clients.
  - Do not place the internal host in public navigation, sitemaps, feeds, metadata, public documentation, marketing pages, email templates, analytics referrers or discoverable client bundles.
- [ ] Choose and prove an access architecture that satisfies the required **connection-level denial** behavior before building the internal UI.
  - Unauthorized visitors must not receive an application-generated 404, 403, redirect, sign-in page or branded denial page from `int.<domain>`; the connection must fail before the internal application is reached and must not confirm that an NJ Courier internal service exists.
  - A normal public DNS record plus application login cannot provide that behavior: DNS and TLS occur before Clerk or the application knows the user. Do not misrepresent a hidden route, generic 404 or client-side role check as an invisible domain.
  - Compare and prototype an identity-aware private-access gateway, managed Zero Trust access, VPN/private network with split-horizon DNS, mutual TLS/client certificates and any hosting-provider-native private deployment control available at implementation time.
  - If a literal browser-level “cannot connect/domain not found” result is required, use private or split-horizon DNS plus an enrolled network/device path; a publicly resolved hostname or public certificate may reveal the host even when its application is protected.
  - If authorized users must connect from arbitrary outside networks without a VPN, document the tradeoff: an identity-aware edge can deny access before the app, but its challenge or denial may still reveal that an access service exists.
  - Select the design only after testing it from an authorized external device, an authenticated but unauthorized account, a signed-out browser, an unenrolled device and an unrelated public network.
  - Keep the private-access provider replaceable and record any free-tier limits, pricing risk, account ownership, recovery procedure and hosting constraints before adoption.
- [ ] Define enrollment, eligibility and revocation for the small set of people permitted to connect.
  - Use the existing Clerk identity, active-user state and employee capability-grant model where appropriate, adding only the fine-grained internal capabilities actually required by audited workflows.
  - Require an explicit internal-host eligibility grant in addition to any broad staff role; a Studio role, NJC+ entitlement, trial, invited-beta grant or possession of the URL must never imply internal-host access.
  - Support approved outside access through a controlled account/device enrollment flow with start, expiration, revocation, reviewer, reason and audit history.
  - Re-check eligibility at the perimeter and server on every session and privileged request. Revoked, expired, disabled or role-changed accounts must lose access promptly.
  - Provide least-privilege sections and action-level capabilities so internal-host access does not automatically grant role management, exports, licensing, private chat or other sensitive tools.
  - Define secure recovery and tightly audited break-glass access without a shared password, permanent bypass, secret URL or client-editable claim.
- [ ] Enforce defense in depth even though unauthorized traffic should be stopped before the application.
  - Validate authentication, active account state, capability, resource access and action permission on the server for every internal page, API, attachment, export, live subscription, notification and deep-link destination.
  - Never trust a role, target ID, host, origin, forwarded header, account search result or destination supplied by a client.
  - Add strict accepted-host validation and ensure internal routes and APIs cannot be reached through the canonical publication, `studio`, `api`, `plus`, CDN, raw `*.vercel.app` deployment URL, a preview URL, an alternate rewrite or a forged `Host`/forwarded-host header.
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

## Roku — highest platform priority after the mandatory implementations

- [ ] Create a ground-up Roku UI/UX redesign that reproduces the NJ Courier website's design direction and editorial experience as closely to 1:1 as practical while being genuinely designed, built and tested for television.
  - Preserve the original product direction: “If Netflix can get a design like that, we need to get a full matched UI/UX as the site itself. It needs to look like Roku got a browser and we just took the site and went *plop*.”
  - Use Netflix as an explicit benchmark for television-grade quality. The finished Roku experience must match or exceed that level of polish, responsiveness, focus clarity, navigation confidence, content presentation and perceived completeness.
  - Do not copy Netflix's branding or layouts. Apply that standard of execution to an original NJ Courier experience whose visual and editorial direction comes directly from the website.
  - The finished interface must not look like a stock or “native-looking” Roku channel. Build a distinct visual system from the ground up with custom components, transitions, focus treatments, navigation behavior, loading states and editorial layouts.
  - Use Roku's supported platform APIs underneath without allowing default widgets, templates or platform styling to define the visible experience. Any necessary native control must be wrapped, restyled or visually integrated into the NJ Courier system.
  - Treat the website as the visual and editorial source of truth: match its publication identity, colors, typography hierarchy, spacing, dividers, imagery, story prominence, section structure and overall character instead of using a generic Roku template.
  - Do not achieve the 1:1 appearance by embedding a website, imitating mouse interactions or simply scaling a desktop layout. Recreate it as a custom television interface with remote-appropriate behavior.
  - Use platform-supported hardware acceleration and hardware-aware techniques where they materially improve the experience: compositor-friendly transforms, efficient texture and image reuse, prefetching, caching, virtualized content rails, bounded animation work and graceful degradation on slower Roku hardware.
  - Establish measurable launch, navigation, animation, memory and image-loading budgets, then profile them on both lower-powered and current Roku devices. Visual ambition must not produce delayed input, dropped focus events, stutter or crashes.
  - Adapt density, typography, safe areas, focus treatment, navigation depth, reading width, animation and information hierarchy for a ten-foot viewing distance and directional remote input.
  - Every interactive element must have an obvious focused state, a predictable remote path and a sensible Select or Back action; nothing may depend on hover, touch, scrolling gestures or a pointer.
  - Recreate the site's major experiences for a ten-foot interface: front page, latest news, sections, live coverage, weather, article reading, account state and settings.
  - Use polished, content-rich layouts and rails that feel deliberate and complete on television, including when feeds are sparse, stories lack imagery or network content is still loading.
  - Pull from the same production APIs and content model as the website so placement, labels, images, breaking-news treatment and publication state remain consistent.
  - Translate hover and pointer interactions into obvious Roku focus states, predictable directional navigation and remote shortcuts without losing the site's visual character.
  - Eliminate blank cards, unexplained translucent bars, clipped labels, focus on invisible elements and layouts that appear unfinished when content is missing.
  - Create responsive Roku layouts for 720p, 1080p and 4K with television safe areas, readable long-distance typography and performant image loading.
  - Validate the redesign on real Roku hardware, not only screenshots or a simulator.
- [ ] Make the Roku experience mirror the live configuration managed in Studio instead of maintaining a separate hardcoded set of tabs, labels and features.
  - Consume the same audited production configuration API used by the website, extending the shared contract only where a television-specific presentation value is genuinely required.
  - Match Studio's configured navigation visibility, labels and order. Disabling, enabling, renaming or reordering a supported website tab must produce the corresponding Roku change without a channel rebuild or reinstall.
  - Apply shared feature flags consistently. For example, disabling Live video or Weather in Studio must remove its Roku navigation and entry points rather than leaving an empty or broken screen.
  - Preserve platform-appropriate presentation: the configuration decides what content and features exist, while the custom television design decides how they are arranged and controlled.
  - Refresh configuration on launch, resume and a bounded background interval; use a validated last-known-good configuration during temporary network failures.
  - Version and validate configuration responses, reject unsafe or unsupported destinations, and fall back gracefully when a web-only navigation item has no television equivalent.
  - Add cross-platform contract tests proving that representative Studio changes produce equivalent website and Roku availability while preserving Roku-specific layout and focus behavior.
- [ ] Make full articles vertically scrollable with the Roku remote. Article body text is currently cut off below the visible screen and cannot be reached.
  - Fix the current overlay-focus defect first: after an article opens, the remote still moves and activates the story rail or navigation behind the article instead of controlling the article reader.
  - Treat the article reader as a modal focus scope. It must capture Up, Down, Fast Forward, Rewind, Select and Back while open, and no hidden control behind it may receive those events.
  - Up and Down must scroll the article without unexpectedly moving focus back to the navigation or another story.
  - Fast Forward and Rewind may provide page-sized scrolling if that matches Roku interaction conventions.
  - Show a subtle scroll-position indicator so viewers know more content is available.
  - Keep headlines, metadata, lead images and body copy inside television safe areas at 720p, 1080p and 4K.
  - Preserve the reader's position when focus temporarily moves to an article action.
  - Back must return to the previous story list and restore the previously selected story.
  - Test unusually long headlines, long-form stories, articles without images and articles containing many paragraphs.
- [ ] Complete a real-hardware Roku accessibility and remote-navigation pass, including focus visibility, readable type size, contrast, overscan and screen-reader labels where Roku supports them.
- [ ] Add clear Roku loading, offline, retry, empty-feed and API-error states instead of leaving partially populated layouts on screen.
- [ ] Verify account pairing survives channel restarts, expires safely and removes all sign-in prompts after connection.
- [ ] Verify newly published, updated and deleted stories refresh correctly on Roku without reinstalling the channel.

## Secure QR and code pairing — all platforms

- [ ] Add an explicit secure processing state after a QR code is scanned on Roku, Apple TV, Android TV, web quick sign-in and every other pairing surface.
  - Generate a new QR code and human-readable sync code every 60 seconds while the code is waiting to be scanned, with a visible countdown where appropriate.
  - As soon as the server recognizes a legitimate scan, freeze that QR code, sync code and countdown so the on-screen identity cannot rotate during authentication.
  - Blur the frozen QR code and place a loading spinner inside its bounds to clearly show that authentication is being processed.
  - Disable repeated scans, code reuse and conflicting pairing attempts while that frozen request is pending.
  - Bound the frozen processing state with a secure server-controlled timeout; if authentication fails or expires, explain the failure and issue a fresh single-use code.
  - Validate pairing state, code lifetime, nonce and requesting device on the server; never trust a client-only scanned or authenticated flag.
  - After successful authentication, replace the entire screen with an unambiguous authenticated-success view.
  - Keep the success screen visible for five seconds, then refresh the account/session state and return to the exact screen, selected item and navigation position shown before pairing began.
  - If the original destination no longer exists, return to the closest safe landing screen and explain what changed.
  - Test success, denial, expiration, network loss, app restart, duplicate scan and revoked-account behavior without exposing credentials or sensitive account information.

## Newsroom and publishing

- [ ] Redesign Studio’s **Users & roles** directory with role-based tabs for All accounts, Readers, Contributors, Reporters, Producers, Editors and Administrators, with Alpha and Beta filters added when release-channel management is implemented.
  - Find and implement a reliable server-side filtering and counting approach that covers the complete Clerk directory, not only the 25 accounts loaded on the current page.
  - Each tab must show an accurate total, retain search and pagination, and update immediately after an administrator changes a role.
  - Keep account status, presence, platform, last-active time and security indicators visible without turning the directory into an unreadable table.
  - Audit release-channel changes with the same rigor already used for profile and role changes.
  - Add production tests proving that accounts cannot disappear between tabs, role changes cannot be forged by the client and reader accounts remain visible.
- [ ] Add reviewer notes and a clear reason when a story is returned to draft.
- [ ] Finish the Studio media library: browse, search, reuse, replace, caption, credit and safely delete unreferenced assets.
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
