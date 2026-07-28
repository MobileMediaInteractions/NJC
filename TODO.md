# NJ Courier TODO

This file tracks known follow-up work. Items here are requirements, not claims that the feature is already implemented.

## Mandatory first product implementation — pseudonyms, approval-gated scheduling and complete Studio control

> **Execution-order requirement:** This is the first product implementation to complete after the mandatory Bun and Protocol Buffers investigation immediately below. Finish and verify this entire section before internal-domain work or any platform-specific implementation.

- [ ] Add a first-class **pseudonym/pen-name authorship system** for every Studio user profile.
  - Audit the existing Clerk user, newsroom profile, database author and public staff/byline models before changing them; extend the current source of truth instead of creating an unrelated author record.
  - Give each eligible Studio user an optional pseudonym field in their own profile with clear help text, validation, length limits and a preview of how the byline will appear.
  - Require an explicit save action and show the saved state. A partially entered or unsaved pseudonym must never become available in the story editor.
  - Prevent blank, deceptive, reserved, impersonating or markup-bearing pseudonyms and define an administrator review/correction path for misuse without exposing private account information.
  - Keep the real staff account connected internally for permissions, ownership, editorial review, audit history, legal response and abuse investigation; never treat a pseudonym as a second login or a way to bypass accountability.
  - Do not expose the underlying legal/display identity through public article APIs, HTML, metadata, JSON-LD, social cards, feeds, sitemaps, URLs, image alt text or client bundles when that story was intentionally published under the pseudonym.
  - Decide and document how pseudonymous contributors appear on public author pages and the staff directory, including whether a dedicated pseudonym author page is created or the story omits a profile link.
  - Preserve a per-story byline snapshot so changing or removing a profile pseudonym does not silently rewrite previously published stories. Historical changes must use an authorized, audited editorial correction workflow.
- [ ] Add an explicit pseudonym choice to the story creation and editing workflow.
  - When the signed-in author has a saved pseudonym, show a clearly labeled checkbox/tick such as **Publish this story under my pseudonym**, defaulting to off unless an approved newsroom policy intentionally says otherwise.
  - When checked, populate the saved pseudonym automatically; do not make the author retype it and do not allow an arbitrary one-off pen name in the story form.
  - Hide or disable the control with an explanation when no pseudonym has been saved, with a permission-aware link to the profile editor.
  - Show the exact public byline in the story preview, review screen, publishing confirmation and scheduled-story summary so the author and editor cannot mistake which identity will appear.
  - Preserve the author’s real internal ownership while returning only the selected public byline through reader-facing contracts.
  - Revalidate the pseudonym at save, review, approval, scheduling and publication time. If it is removed, invalidated or administratively disabled before publication, fail safely and require a new editorial decision.
  - Treat a byline-mode change after approval as a material editorial change that invalidates the prior approval and returns the story to review.
  - Support authorized reassignment and collaborative/multiple-author stories without allowing one employee to select another person’s pseudonym merely by changing a client-supplied ID.
- [ ] Complete a production-grade **approval-gated story scheduler** using the existing story workflow, scheduled status, `scheduledAt` data and publication queue where they are valid.
  - Enforce the state machine on the server: a draft cannot be scheduled, a story in review cannot self-publish and only a story that has received the required approval may enter the scheduled queue.
  - Record approval as an auditable event with approver, approved revision/content hash, timestamp and any required note. “Review” status alone must not be treated as approval.
  - Add permission-aware scheduling controls only after approval, including date, exact time, newsroom timezone and an unambiguous UTC preview.
  - Use accessible date/time pickers and safe presets, reject invalid or past times and explain daylight-saving-time ambiguities before saving.
  - Publish at or immediately after the selected instant—never before it—and make the operation transactional and idempotent so retries or concurrent workers cannot publish twice.
  - Re-check approval, content revision, author/byline validity, required media, embargoes, permissions and publication configuration immediately before the scheduled transition.
  - Any material edit after approval—including headline, body, lead media, canonical URL, section, public byline or scheduled destination—must invalidate approval and remove the story from automatic publication until it is reviewed again.
  - Support reschedule and cancel actions with confirmations, permissions and audit history. Show who changed the schedule, the original time and the current effective time.
  - Provide clear queued, due, publishing, published, cancelled, blocked and failed states in Studio, with retry and escalation information that does not require reading server logs.
  - Select a reliable free-tier-compatible execution mechanism rather than pretending the current once-daily Hobby cron can deliver precise publication. Document timing guarantees, outage recovery and what happens when the scheduler is delayed.
  - On recovery, publish eligible overdue stories once according to documented newsroom policy, while holding stories whose approval, revision or validation no longer matches.
  - Invalidate relevant caches and update feeds, sitemaps, APIs, mobile/TV/Roku clients, notifications and analytics only after the database publication transaction succeeds.
- [ ] Turn **Studio → Configuration** into a complete, typed registry and control center for the entire platform.
  - Inventory every current feature, route, page, navigation item, content module, API capability, integration, experiment, release channel and platform-specific experience across web, iOS, Android, employee app, Apple TV, Android TV, Roku, NJC+, CDN, developer API, Studio NJ Dev and the feature/animation platform.
  - Register every feature with a stable key, human-readable name, description, owner, category, supported platforms, current availability, default state, dependencies, conflicts, required permissions, rollout behavior and whether changing it requires a rebuild, redeploy or migration.
  - Classify each registry entry as **toggleable**, **configuration-only**, **environment-managed**, **release-gated**, **planned**, **deprecated** or **mandatory safety control** so administrators can see every feature even when it cannot safely be switched off in the UI.
  - Provide enable/disable controls for every feature that can safely support runtime switching. Authentication, authorization, audit integrity, encryption, backups and other mandatory safeguards must remain visible but cannot become a casual off switch.
  - Use one versioned, schema-validated configuration source of truth with scoped platform overrides instead of unrelated booleans and hardcoded navigation arrays scattered across clients.
  - Make navigation visibility, order and labels configuration-driven where supported while preventing arbitrary URLs, invalid destinations, inaccessible routes and a configuration that leaves users trapped without navigation.
  - Include pseudonyms and scheduled publication in the registry, with separate controls for feature availability, role eligibility and operational readiness; disabling either must preserve existing records safely.
  - Add dependency-aware controls: explain downstream effects before a change, block invalid combinations and offer an impact preview showing affected pages, APIs, roles, platforms and currently scheduled or published content.
  - Use the minimum-necessary-typing patterns defined later in this TODO: searchable selectors, grouped toggles, presets, generated keys, inline guidance and clear defaults instead of manual IDs or raw JSON.
  - Add search, category/platform filters, status summaries, “changed recently,” unsaved-change indicators and a review screen for pending modifications.
  - Require typed confirmation and, where risk warrants it, a second authorized approval for disabling high-impact production capabilities.
  - Record actor, timestamp, before/after value, reason, target environment and affected platforms for every change; provide a permission-checked history and safe rollback to a known-good configuration.
  - Apply changes atomically, reject stale concurrent edits and distribute a versioned configuration to clients with last-known-good caching and fail-safe defaults.
  - Never expose secrets in the configuration document, browser responses, history or exports. Keep credentials in environment/secret storage and show only connection health or safe identifiers.
- [ ] Redesign the Configuration area as an original **NJ Courier producer/admin panel**, using the referenced HQ Trivia producer-panel concept as functional inspiration.
  - Carry forward the useful producer-console idea from the referenced article: administrators should be able to prepare, schedule and control interconnected product behavior from a coherent operational workspace rather than editing scattered technical values.
  - Do not copy HQ Trivia, Intent’s screenshots, branding, wording or proprietary layout. Translate the workflow principles into an original editorial/newsroom product.
  - Preserve the established NJ Courier color system, typography and visual identity across light, dark and system themes.
  - Use a deliberate information hierarchy with a status overview, platform health, feature groups, publishing controls, warnings, dependencies, recent changes and audit activity without making the interface cramped.
  - Provide responsive desktop and tablet layouts, keyboard navigation, screen-reader labels, strong focus states, sufficient contrast and reduced-motion behavior.
  - Make risky actions visually distinct without turning the entire panel red or alarm-heavy; routine configuration should remain calm, clear and fast.
  - Preview representative site and app consequences where practical, but never simulate success when a platform requires a rebuild, external credential or deployment.
- [ ] Add migration and verification coverage for the complete section.
  - Migrate existing users and stories without inventing pseudonyms, changing public bylines or marking unapproved content as approved.
  - Add database constraints and indexes needed for byline history, approval revisions, scheduled work and configuration versions, with a reversible migration and portable-backup support.
  - Add unit, integration and end-to-end tests for profile pseudonyms, public identity privacy, byline snapshots, authorization, approval invalidation, scheduling accuracy, retries, overdue recovery, configuration dependencies, concurrent edits, audit history and rollback.
  - Verify public web, Studio, developer/reader APIs, mobile, employee, TV and Roku clients against enabled, disabled, stale and unavailable configuration states.
  - Test the scheduler across timezone and daylight-saving boundaries and perform a real production-like scheduled publication rehearsal before relying on it for news.

## Mandatory preliminary investigation — Bun and Protocol Buffers

> **Execution-order requirement:** Complete this evidence-based investigation before implementing the mandatory product section above or any later TODO. Do not migrate the repository merely because another service reported a 21× improvement; establish this platform’s own baseline, isolate the source of any improvement and proceed only when measured production-representative results justify the compatibility and migration cost.

> **Origin of this investigation:** The reported comparison was specifically a migration of the Question House backend from Node.js to Bun that reportedly made its WebSocket “21x faster.” That project also migrated all application endpoint payloads from JSON to Protocol Buffers and reported faster, smaller and more secure requests. Preserve those as two related but separately testable claims: Bun runtime/WebSocket performance and Protocol Buffers endpoint serialization. Protocol Buffers may reduce payload size and parsing work, but binary serialization is not encryption and does not make a request secure without the existing transport security, authentication, authorization, validation and abuse controls.

- [ ] Determine whether adopting Bun would materially improve this repository without destabilizing its supported applications or exceeding the requirement to use free services.
  - Evaluate **Bun as the package manager**, **Bun as the local script/test runtime**, **Bun as the build runtime** and **Bun as the Vercel Functions runtime** as four separate decisions. Do not describe a faster dependency installation as a faster production API.
  - Reconfirm Vercel support and plan availability at implementation time. As of this TODO update, Vercel documents Bun package-manager support and a Bun Functions runtime in Beta on all plans, including Next.js when configured explicitly; Beta status and compatibility still require a guarded production trial.
  - Audit compatibility across the complete workspace: Next.js and Routing Middleware, Turborepo, Clerk, Neon/Postgres, Drizzle and migrations, Vercel Blob, Upstash, Stripe and webhooks, cron jobs, backup scripts, Expo reader/employee/TV builds, React Native TV, Roku tooling, Vite/Tauri, Rust integration, the animation/compiler workspaces, CI and every existing test/build/release command.
  - Identify Node-specific APIs, native modules, postinstall/build scripts, package-resolution assumptions, lockfile behavior, environment loading, filesystem/process usage and tools that Bun does not support identically.
  - Establish the current pnpm/Node baseline before changing anything: clean and cached install time, CI time, local startup and hot reload, Next.js build time, cold and warm function startup, request throughput, p50/p95/p99 latency, CPU time, peak memory, error rate and production cost.
  - Give WebSocket and other real-time paths their own benchmark track so the reported Question House result is compared against equivalent persistent-connection behavior rather than ordinary HTTP or install-time measurements.
  - Run reproducible isolated comparisons using pinned versions, the same hardware or Vercel conditions, the same dependency cache state, representative production data and enough iterations to report variance rather than one favorable run.
  - Benchmark incremental options in order: Bun installs with Node runtime, Bun scripts/tests where compatible, Bun builds, then selected Bun Vercel functions or a Bun Next.js canary. Preserve the working pnpm/Node path throughout the evaluation.
  - Require the entire existing test, lint, typecheck, build, migration, backup/restore and platform verification matrix to pass under any proposed configuration.
  - Record regressions and unsupported surfaces explicitly. A mixed runtime is acceptable when it provides a measurable benefit and has a clear ownership model; a repository-wide conversion is not a goal by itself.
  - Approve migration only with predefined thresholds for meaningful end-to-end improvement, no security or correctness regression, no loss of observability, an acceptable maintenance burden and a tested one-step rollback.
- [ ] Determine whether Protocol Buffers should replace JSON for any data path, and prefer a measured selective adoption over an automatic repository-wide rewrite.
  - Inventory every JSON use separately: public and developer HTTP APIs, Server Component data, browser fetches, mobile/employee/TV/Roku clients, device pairing, Studio forms, chat polling, analytics ingestion, feature/configuration delivery, platform packages, Lottie animation files, manifests, backups/exports, logs, webhooks and third-party integrations.
  - Classify each use as an external compatibility contract, internal network protocol, persisted data format, human-authored configuration, interchange/archive format or implementation detail. Protocol Buffers must not be substituted where JSON is required by a standard, third party, editorial workflow or existing public contract.
  - Do not convert Lottie JSON, JSON-LD structured data, web manifests, Vercel/package configuration, portable human-readable exports or other standardized JSON formats merely to claim protocol adoption.
  - Identify the strongest candidates first: large or high-frequency internal service payloads, mobile/TV synchronization, chat/event traffic, analytics batches or animation/runtime messages where bandwidth and encode/decode work are proven bottlenecks.
  - Compare JSON with compression against binary Protocol Buffers using representative small, medium and worst-case messages. Measure encoded bytes, compression ratio, encode/decode time on server and every relevant client, allocation/memory cost, network transfer, battery/device impact, p50/p95/p99 end-to-end latency and failure behavior.
  - Include lower-powered real Roku and television hardware in the benchmark. Generated TypeScript support alone does not prove that BrightScript, native, browser and offline clients can adopt the format safely or efficiently.
  - Include schema/compiler generation time, bundle-size growth, debugging and observability cost, CDN/cache behavior, browser content negotiation, gateway/serverless overhead and the operational cost of maintaining generated clients.
  - Define versioned `.proto` ownership, package naming, field-number reservation, compatibility rules, unknown-field behavior, enum evolution, optional-field presence, deterministic fixtures and generated-code review. Never reuse or renumber a released field.
  - Keep public JSON compatibility where consumers need it. If useful, add content negotiation or a versioned binary internal endpoint rather than silently changing an existing API response.
  - Treat Protocol Buffers as serialization, not encryption or authorization. Preserve payload-size limits, authentication, permission checks, input validation, rate limits, auditability and safe error handling.
  - Build a dual-read/dual-format canary with contract tests and golden fixtures before migration, then verify mixed-version clients, rollback, replay, corrupt payloads, missing fields and old cached data.
  - Approve each conversion only when the measured end-to-end gain outweighs schema/tooling/client complexity. Document rejected candidates so the same investigation is not repeatedly reopened without new evidence.
- [ ] Produce a written recommendation before implementation.
  - Report which gains come from installation, build startup, server cold starts, application execution, smaller payloads or reduced network transfer instead of combining them into a misleading single multiplier.
  - Include the benchmark harness, raw results, environment and versions so the claimed improvement can be reproduced.
  - Compare full Bun/full Protobuf, selective adoption and retaining pnpm/Node/JSON, including migration effort, compatibility risk, free-tier constraints and rollback cost.
  - State a clear **adopt**, **adopt selectively**, **defer** or **reject** decision for Bun and for each Protocol Buffers candidate. The reported 21× result from another service is context, not this project’s acceptance criterion.

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

## Measurement and advertising — complete last

- [ ] Connect Google Analytics after the final domain, consent behavior and privacy disclosures are approved; validate events without collecting unnecessary personal or sensitive data.
- [ ] Create and approve the external AdSense account, register the production domain, configure a Google-certified consent message, create ad units, review Google’s site approval, then enter the real publisher and slot IDs in Studio before disabling Preview mode.
- [ ] After live inventory is approved, validate consent withdrawal, reporting, fill failures, accessibility, layout shift, Core Web Vitals, placement policy compliance and reasonable ad density on real desktop and mobile pages.
