# Implementation report — 2026-07-14

This report records the repository-wide audit, the dedicated employee application, and the first production-oriented milestone of the licensed feature and animation platform. It separates verified source/build results from work that requires production infrastructure, credentials, native toolchains, or additional product decisions.

## Applications and packages inspected

| Area | Technology | Result |
| --- | --- | --- |
| `apps/web` | Next.js 16, Clerk, Drizzle/Neon, Vercel Blob | Audited and extended with employee APIs, platform licensing APIs, association routes, development integration, SEO, press-kit and backup coverage |
| `apps/mobile` | Expo/React Native for iOS and Android | Audited; privileged UI removed and replaced with permission-aware employee-app handoff |
| `apps/employee` | New separate Expo/React Native app for iOS and Android | Implemented with distinct identity/configuration, authentication, chat, tools, notifications, access requests and deep-link routing |
| `apps/tv` | Expo plus `react-native-tvos` | Audited and exported for Apple TV/iOS and Android TV; intentionally remains a public lean-back client |
| `apps/roku` | BrightScript/SceneGraph | Audited; validator and BrightScript type checks pass |
| `apps/cdn` | Static Vercel app | Audited as the optional same-origin or future custom-domain asset origin |
| `apps/platform-playground` | New Next.js app | Implemented as a compiler/runtime playground and successfully production-built |
| `packages/contracts` | Shared TypeScript contracts | Extended with capabilities, access states and versioned employee deep links |
| `packages/api-client` | Shared TypeScript API client | Reused by the reader and employee applications |
| `packages/backend` | Shared Drizzle schema | Extended for employee communication/access and licensed-platform persistence |
| `platform` | New TypeScript feature, licensing and animation workspace | Implemented core host, DSL/compiler, deterministic binary/runtime, importers, tooling, reference licensing service, SDK foundations, tests and documentation |

The detailed pre-change findings and parity decisions are in `docs/PROJECT_AUDIT_2026-07-14.md`.

## Existing updates synchronized

- Preserved and verified the New Jersey Courier identity, responsive web work, light/dark/system themes, SEO surfaces, press-kit generation, legal/developer pages, CMS, portable backup, asset/CDN layout, TV pairing, public APIs and device clients already present in the working tree.
- Retained Clerk as the identity provider instead of introducing a competing account system.
- Reused the existing API envelope, contracts, database connection, Expo secure storage, audience taxonomy and push infrastructure.
- Removed the reader app's embedded administrative screen. Existing operational controls are now surfaced in the dedicated employee app and remain protected by server capabilities.
- Added CI for platform conformance, tests, benchmarks, the C ABI smoke test, web/playground builds, app checks, migration freshness and dependency audit timeout handling.

## Employee application architecture

`apps/employee` is a separate application target with bundle/application ID `com.mobilemediainteractions.thenews.employee`, scheme `njcourier-employee`, independent Expo/EAS configuration, secure token cache, navigation, environment and release path. It shares safe contracts, identity, network conventions and theme tokens; it does not place secrets or privileged authorization decisions into the reader client.

Implemented employee areas:

- Permission-aware home and navigation.
- Internal channels, direct messages, message history/search, unread/read state, replies, mentions, editing, soft deletion and reconnecting polling.
- API foundations for groups, membership management, pins, message reporting, presence/typing and private JPEG/PNG/WebP/PDF attachments.
- Existing operational metrics, editorial queue, alerts and live controls.
- License administration listing plus suspend, restore and revoke actions.
- Notifications, profile/session, access status, access request and reviewer flows.
- Loading, empty, offline/retry, expired-session, denied, role-changed, unsupported-link and missing-resource handling.

### Real-time choice

The launch transport is authenticated, cursor-based polling through Vercel Functions and Neon Postgres. It delivers near-real-time updates without adding a second provider to a repository that had no existing socket stack. Membership and capability checks occur on every read/write path. The transport boundary can later move to WebSockets or managed pub/sub without changing the data/authorization model. It is not represented as an always-connected Slack/Discord clone.

## Authentication, roles and permissions

- Both mobile apps use the existing Clerk identity provider but retain tokens in their own platform-secure storage; tokens are not copied between applications.
- The server combines active-user validation, existing role defaults and allow/deny/expiry/revocation grants.
- Implemented capabilities: employee access, chat read/write/manage/moderate, metrics, editorial, alerts, live controls, access review and platform license administration.
- Enforcement exists at API, navigation, screen/action, deep-link resolution, channel membership, attachment, push-recipient and approval layers.
- Sensitive employee and license mutations create audit events. IDs, content, uploads, cursor values, transitions and allowed destinations are validated server-side.

## Deep links, installation and access

Version 1 supports:

```text
njcourier-employee:///v1/<destination>
https://<configured-host>/employee-link/v1/<destination>
```

Allowed destinations include the employee dashboard, notifications, access request, implemented newsroom tools, license administration and UUID-addressed chat channels. The employee API resolves every link again for authentication, minimum app version, capability, membership and resource existence.

- Installed and authorized: open the employee app, validate the preserved destination and continue after sign-in if necessary.
- Installed but unauthorized: show a non-sensitive denied state and offer access request where supported.
- Missing but eligible: show only configured real store, beta, enterprise or managed-distribution links; no invented store URL.
- Missing and ineligible: request access before installation guidance.
- Invalid, deleted, expired, unauthorized or unsupported links: fail safely and offer an allowed landing destination.

Universal Links/App Links are conditional on the deployed host, Apple application ID and Android signing fingerprints. The repository provides both association routes, but production validation requires those external values.

## Access requests and notifications

Access requests record requester, capability, source, intended destination, reason, status, reviewer, timestamps and reviewer note. The API blocks duplicate recent pending requests, nonexistent capabilities, unauthorized review, self-review, and replayed transitions. Approval creates a server-side grant; it does not trust client state.

Employee device tokens and notifications are permission filtered. Mentions, direct messages, access decisions and operational events can route through the same validated deep-link resolver. Generic previews avoid placing internal message content in lock-screen payloads.

## Backend and migrations

- `0007_happy_beyonder.sql`: employee grants, access requests, channels, membership, messages, read state, attachments, reports, presence, device tokens, notifications and audit support.
- `0008_omniscient_moira_mactaggert.sql`: organizations, customers, products, applications/exact identities, plans, licenses, seats, installations, activations, offline leases, signing-key metadata, idempotency, audit, webhook and usage structures for the licensed platform.
- New employee routes cover eligibility/bootstrap, access request/review, chat, membership, messages, reads, presence, attachments, directory, notifications, push, tools and deep-link resolution.
- New platform routes cover keys, activation, validation, online/offline leases, installation deactivation, entitled features, catalog administration and license status administration.
- Portable backup includes the new employee and platform tables and private attachment objects. Push tokens and sensitive installation/credential hashes are removed or disabled in the export.

## Licensed feature and animation platform

The `platform` workspace provides a coherent, testable first milestone:

- Versioned feature manifest, capabilities, entitlements, dependencies, conflicts, lifecycle, upgrades/rollback hooks, events, kill switches and resource budgets.
- Three representative feature modules and a host that detects cycles/conflicts and enforces capability/entitlement gates.
- Signed Ed25519 receipts bound to exact application/platform/environment/build identity, online and bounded offline leases, key rotation, revocation, version checks, idempotency and audit records.
- Explicit first-party licensing through signed entitlements; there is no hidden bypass. Development fixtures require `PLATFORM_DEV_LICENSE_MODE=true` and reject production.
- `.pani` lexer, parser, formatter, semantic analyzer, compiler, source diagnostics, deterministic FlatBuffers package container, checksum verification and minimum-runtime validation.
- Timeline, easing, spring, state-machine, event, binding, seek/reverse/speed, reduced-motion and retarget runtime behavior.
- Web DOM hybrid renderer with a host-property allow list; static SVG, Lottie/dotLottie compatibility reporting and safe raster validation.
- Language service, stdio LSP server, TextMate grammar and tree-sitter grammar.
- C ABI/C++ implementation and compile smoke test plus Swift and Kotlin wrapper foundations.
- Development-only web integration and a standalone playground with compile diagnostics, package inspection, playback controls, inputs, reduced motion and responsive previews.

The verified end-to-end demonstration exercises source → parser → semantic analysis → compiler → FlatBuffers package → verifier → signed entitlement → runtime → state machine → frame → host event. It proves both exact first-party and ordinary licensed third-party activation, while rejecting wrong application identity, tampering and revocation.

## Security controls

- Ed25519 signing and canonical payloads; active/retired verification keys support rotation.
- Exact application identity and current signed receipt are rechecked for refresh and deactivation.
- HMAC-derived license/device identifiers avoid persisting raw activation keys or device identifiers.
- Production rate-limited licensing routes fail closed when durable Upstash configuration is absent.
- No public endpoint issues first-party entitlements; production app attestation remains an external integration decision.
- Server-side channel membership, permission and resource checks prevent guessed-ID subscriptions and direct-object access.
- Private attachment type/size limits and authorization; message sanitization/length validation; soft deletion and auditability.
- Generic push content, protected approval/status endpoints, safe logs and secret-by-environment configuration.

## Verification results

| Check | Result |
| --- | --- |
| Workspace `pnpm typecheck` | Pass, 9 tasks |
| Workspace `pnpm lint` | Pass, 7 tasks, no warnings |
| Workspace `pnpm test` | Pass: platform 26, web 15, employee 3, Roku validation |
| Web production build | Pass, 83 routes |
| Playground lint/typecheck/production build | Pass |
| Platform build/conformance/demo/benchmark | Pass |
| Receipt schema alignment | Corrected to match the complete TypeScript claims contract |
| C ABI/C++ smoke build | Pass with Clang `-Wall -Wextra -Werror` |
| Reader iOS export | Pass, 4.7 MB Hermes bytecode |
| Reader Android export | Pass, 5.0 MB Hermes bytecode |
| Employee iOS export | Pass, 4.6 MB Hermes bytecode |
| Employee Android export | Pass, 4.9 MB Hermes bytecode |
| Apple TV/iOS export | Pass, 1.5 MB Hermes bytecode |
| Android TV export | Pass, 1.5 MB Hermes bytecode |
| Roku validator/BrightScript typecheck | Pass |
| Drizzle migration generation check | Pass: 51 tables, no uncommitted schema migration |
| Browser verification | Pass: playground compiled/played real package; web integration had no console errors; 375 px viewport had no horizontal overflow |
| `git diff --check` | Pass |
| Local dependency audit | Inconclusive: registry request produced no result and was stopped; CI has a 120-second bound |

The last recorded animation benchmark passed all configured budgets: 24.839 ms compile, 0.1343 ms median load, 0.6476 ms p95 load, 0.01291 ms mean frame evaluation, 1,707,504-byte heap delta and a 4,256-byte package.

## Remaining parity differences and limitations

- Employee iOS and Android share the same checked-in source and exported successfully. Signed Xcode/Gradle/EAS archives were not produced because signing credentials, EAS project ownership and store/distribution records are external.
- Apple TV, Android TV and Roku intentionally remain public clients; employee chat and operational tools are not appropriate parity targets.
- Web Studio remains the complete CMS. The employee app contains the existing small operational control set, not a duplicate mobile CMS.
- Polling is near real time; a socket/pub-sub transport, full presence presentation and richer chat administration remain future work.
- Platform animation execution is currently production-verified only on web. Native FlatBuffers/crypto verification, a full C++ renderer/JSI binding, Swift/Kotlin renderer integration, Apple TV focus behavior and Roku SceneGraph integration are documented follow-ups.
- The C ABI currently validates package framing and supports runtime controls; it is an SDK foundation, not a claim of native renderer parity.
- Lottie import produces an explicit compatibility report and never silently discards unsupported features; it is not full-fidelity conversion for every Lottie feature.
- Catalog administration is a foundation, not a complete commercial billing, tax, invoicing, marketplace or self-service customer portal.
- Production app attestation, webhook delivery workers, usage aggregation, fraud review and support tooling require later infrastructure.

## External configuration and release steps

- Provision Clerk, Neon/Postgres, Vercel Blob and Upstash credentials and apply migrations in each deployment environment.
- Generate and protect production Ed25519 signing keys and HMAC peppers; rotate them through the documented process.
- Create the separate employee EAS project, signing credentials, push credentials, icons/launch art and approved distribution destinations.
- Set the deployed `*.vercel.app` host now, or a later custom domain, in the employee native build and web association variables.
- Configure Apple Associated Domains/application identifier and Android asset-link signing fingerprints, then validate on physical devices.
- Decide employee public, unlisted, beta, enterprise or managed distribution before publishing installation links.
- Run signed native archives, physical-device push/deep-link tests, production database migration, backup/restore drill, penetration testing and operational load tests.
- Run the bounded dependency audit with registry access and review advisories before release.

## Assumptions

- Existing working-tree code and the most complete active implementation were the source of truth because no released version or production environment was supplied.
- Clerk remains the shared identity provider and Vercel remains the web/API host.
- The neutral `Employee App` identity and current package identifiers are working values, not permanent brand approval.
- A Vercel-generated host must work before a custom domain is purchased; all domain-dependent links are therefore configuration-driven.
- The requested licensed platform is delivered here as a rigorous first vertical milestone with explicit native and commercial-system boundaries, not falsely described as fully production complete on every eventual host.
