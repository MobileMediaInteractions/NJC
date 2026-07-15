# Push report — 2026-07-15

## Comparison baseline

This report compares the pending push on `main` with GitHub commit `d92926c` (`Add Android TV and Google TV support`), which was the exact tip of both local `main` and `origin/main` before this push.

The previous GitHub revision already contained the Harborline reader platform, mobile applications, Apple TV, Android/Google TV, Roku, device pairing, portable backups, developer APIs, audience reporting, responsive appearance settings, and the first editorial-layout work.

This push turns that foundation into **The New Jersey Courier**, adds the dedicated employee product and its authorized backend, introduces the feature/licensing/animation platform and desktop Studio, and adds an extraction-ready Visual Feature Composer.

## Change-set size

Exact staged statistics after adding this report:

```text
495 files changed, 34,677 insertions, 1,511 deletions
```

Generated Expo caches, exported application bundles, TypeScript build output, native build folders, and the generated web copy of canonical CDN assets are intentionally excluded. Canonical source assets, migrations, schemas, native adapters, tests, documentation, screenshots, and lockfiles are included.

## 1. Publication identity and editorial product

The fictional Harborline identity has been replaced across the current product surfaces by **The New Jersey Courier — The Authoritative Voice of the Garden State**.

The launch model is now explicit:

- Middlesex County is the first local desk and launch region.
- County and municipality reporting form the spokes around a statewide hub.
- Politics & Statehouse, Garden State Forum, Public Square / Weekly Pulse, Jersey Gridiron & Court, Jersey Laurels, and Courier Watch are named editorial products.
- Seed reporting, people, polls, and results remain clearly labeled as fictional launch-preview material.
- The site operates on a generated Vercel hostname before a domain is purchased, while canonical-origin helpers support a later custom domain without changing route contracts.

The web homepage, navigation, section pages, story pages, footer, header, cards, mobile fixtures, TV clients, and Roku presentation now use the Courier identity and a less crowded newspaper-style editorial hierarchy. Desktop and mobile screenshots are checked into `docs/screenshots`.

## 2. Brand assets and CDN-ready delivery

A canonical, versioned asset project now lives in `apps/cdn`.

Included assets cover:

- primary mark and wordmarks;
- inverse treatments;
- adaptive/app icon source artwork;
- the Garden State editorial engraving;
- a machine-readable asset manifest;
- immutable-cache Vercel headers.

The web predevelopment and prebuild flow copies canonical assets into its public tree for same-origin delivery. This works immediately from a Vercel-generated `*.vercel.app` hostname. A later independent Vercel asset project or `cdn.<custom-domain>` changes only the configured origin, not published asset paths.

Mobile icon and Android adaptive-icon assets were added. Brand usage, versioning, ownership, clear-space, typography, color, and migration expectations are documented in the brand guide and asset catalog.

## 3. News SEO and discovery infrastructure

The web application now includes a launch-safe news SEO system:

- configurable canonical origin detection;
- publisher, website, collection, breadcrumb, and `NewsArticle` structured data;
- article SEO title, description, canonical override, and exclusion controls;
- XML sitemap and dedicated recent-news sitemap;
- RSS 2.0 feed;
- crawl-aware `robots.txt` and internal/API `X-Robots-Tag` behavior;
- Google and Bing verification hooks;
- Open Graph and large-card social metadata;
- story publication/update dates, authors, sections, keywords, and image information.

Indexing remains disabled by default because the repository still contains fictional preview reporting. The launch guide explains the production enablement, Search Console/Bing setup, validation, custom-domain transition, and newsroom practices needed to pursue local search visibility. It intentionally makes no ranking guarantee.

## 4. Press-kit generation and media workflow

A public `/press` workflow and Studio press-request view were added.

Media users can provide their identity, organization, work email, intended use, requested materials, and assignment brief. The server generates a private ZIP containing only approved public assets plus:

- request summary;
- publication background;
- usage terms;
- checksummed manifest;
- selected brand/illustration groups.

The endpoint validates inputs, enforces archive-size limits, uses durable Upstash rate limiting in production, falls back safely for local development, records requests when Postgres is configured, and includes request records in portable backups. It does not expose the private newsroom library.

## 5. Dedicated employee application

`apps/employee` is a separate Expo/React Native application for iOS and Android with its own:

- package and application identity;
- custom URL scheme;
- Expo and EAS configuration;
- navigation and release configuration;
- secure token-storage adapters;
- theme, notification, API, and deep-link layers.

The main reader app no longer embeds the former full administrative quick-controls screen. Instead, it performs an eligibility-aware handoff to the employee app and preserves the requested destination.

The employee app includes:

- permission-aware home and navigation;
- operational metrics, editorial, alert, and live tools;
- notifications and profile/session screens;
- access status, access requests, and reviewer flows;
- internal channels and direct conversations;
- history/search, unread/read state, replies, mentions, editing, deletion, and reconnecting polling;
- permission-denied, missing-resource, unsupported-link, offline, retry, session-expired, and role-changed states.

The neutral `Employee App` name and package identifiers remain working values pending final internal branding and store ownership.

## 6. Employee authorization, chat, deep links, and notifications

Shared contracts and the web backend now support fine-grained capabilities rather than relying only on a broad client role.

Implemented capabilities cover employee access, chat read/write/manage/moderate, operational tools, access review, and platform license administration. Enforcement occurs at the API, route, navigation, action, channel membership, attachment, approval, push-recipient, and deep-link resolution layers.

Internal communication uses authenticated, cursor-based polling over Vercel Functions and Postgres. The model supports public/private channels, direct/group conversations, membership, messages, read state, replies, mentions, editing, soft deletion, pins, reports, presence/typing heartbeats, private attachments, search, notifications, and audit events. This is a near-real-time launch transport, not a false claim of full socket parity with Slack or Discord.

Versioned employee links support the custom scheme and configured HTTPS host. Universal Link and Android App Link association routes are present, but production validation still requires the final deployed host, Apple application identifier, and Android signing fingerprints.

Access requests prevent duplicate pending spam, nonexistent capabilities, self-review, unauthorized review, and replayed transitions. Approval creates a server-side grant; client state cannot grant permission.

## 7. Backend schema, migrations, APIs, and portable operations

The Drizzle schema and migrations now cover:

- employee grants and access requests;
- organizations, channels, membership, messages, reads, attachments, reports, presence, device tokens, notifications, and audit records;
- press-kit request records;
- platform organizations, customers, products, applications, plans, licenses, seats, installations, activations, online/offline leases, signing-key metadata, webhooks, idempotency, usage, and platform audit history.

New employee APIs cover bootstrap/eligibility, access request/review, directory, chat, membership, message actions, reads, attachments, presence, notifications, push registration, operational tools, and deep-link resolution.

New platform APIs cover public verification keys, activation, validation, online/offline leases, installation deactivation, entitled features, catalog administration, and license administration.

Portable backups now include the new employee and platform data plus authorized attachment objects. Device tokens and sensitive hashes are removed or disabled in exported material.

## 8. Licensed feature and animation platform

The new `platform` workspace provides an end-to-end TypeScript implementation for:

- versioned feature manifests, lifecycle, dependencies, conflicts, capabilities, entitlements, events, kill switches, and budgets;
- exact-application Ed25519 licensing receipts, online and bounded offline leases, rotation, revocation, idempotency, and audit behavior;
- a `.pani` animation language with lexer, parser, formatter, semantic analysis, diagnostics, and editor language service;
- deterministic FlatBuffers package compilation and SHA-256 verification;
- timeline, easing, springs, state machines, data bindings, reduced motion, seeking, speed, reverse playback, and retargeting;
- a constrained DOM-hybrid renderer boundary;
- image, SVG, Lottie, and dotLottie compatibility reporting;
- LSP, TextMate, and tree-sitter tooling foundations;
- tested C ABI/C++ runtime boundary plus Swift and Kotlin ownership-wrapper foundations.

The standalone `apps/platform-playground` application exposes source compilation, diagnostics, package inspection, playback, inputs, reduced motion, and responsive previews without coupling the public newspaper UI to development tooling.

## 9. Native desktop Studio

`tools/studio` introduces a Tauri 2 desktop IDE using React, strict TypeScript, Monaco, and a narrow Rust boundary.

Implemented Studio areas include:

- bounded workspace discovery and project confidence detection;
- Monaco `.pani` editing with diagnostics, completion, hover, symbols, definitions, formatting, and navigation;
- structured source/visual edits with undo, redo, external-change detection, atomic saves, and recovery snapshots;
- animation canvas, timeline, inspectors, device preview, package inspector, runtime inputs, themes, orientation, and reduced motion;
- state-machine control and accepted/rejected transition traces;
- trusted-workspace gating, allow-listed tasks, toolchain diagnostics, and bounded Git status;
- native Tauri capability configuration and cross-platform icon assets.

The frontend has no general shell or direct filesystem access. Rust owns canonical-path, symlink, read/write, task, and toolchain enforcement.

## 10. Visual Feature Composer

The new extraction-ready `visual-feature-platform` workspace adds a canonical `FeatureIR` shared by the Studio, compiler, controlled-English representation, runtime, tests, and standalone playground.

The Studio Feature editor contains six coordinated modes:

1. Design — component library, device preview, typed inspector, bindings, and accessibility fields.
2. Behavior — typed graph, context actions, and controlled-English projection.
3. Data — schemas, mock data, reactive bindings, and connector contracts.
4. Motion — compositions, property tracks, keyframes, interpolation, cubic/spring data, and reduced-motion alternatives.
5. Test — deterministic connectors, success/failure paths, recorded tests, state, trace, and package inspection.
6. Code — controlled-English editing, formatting, diagnostics, and supported source-to-visual round trips.

The compiler creates deterministic checksum-protected `VFCPKG` packages. The capability-gated runtime includes bounded behavior execution, typed connectors, explicit failures, trace retention, reduced motion, and redacted live-event recording/replay.

Purchase-confirmation and live-information demonstrations exercise the architecture. The implementation report explicitly records remaining work instead of presenting the initial vertical slice as the full requested nine-milestone product.

## 11. Reader, television, and Roku synchronization

- iOS and Android reader content, branding, icons, theme tokens, API defaults, and employee handoff were synchronized.
- Apple TV and Android/Google TV continue to share the TV codebase and now use the Courier identity/configuration.
- Roku SceneGraph layout, branding, API defaults, package metadata, and production packaging documentation were updated.
- Employee communication and operational tools intentionally remain off television clients; that is a product boundary, not a parity defect.

## 12. CI, tests, and repository hygiene

Two GitHub Actions workflows were added for the application/platform and Studio/Composer work. They cover appropriate combinations of:

- installation and lockfile integrity;
- tests, TypeScript, ESLint, and production builds;
- schema/migration and language conformance;
- platform demonstrations and benchmark budgets;
- C ABI/C++ smoke compilation;
- Studio frontend, Rust tests, and native build preparation;
- dependency audit with a bounded timeout.

Repository scripts now expose checks, demos, benchmarks, playgrounds, employee builds, Studio builds, Composer verification, TV, Roku, migrations, and backup workflows from the root.

The root ignore rules now exclude employee Expo caches/exports/native generation, platform TypeScript build output, and the generated web asset mirror. A pre-push secret-pattern scan found no matching private keys, live/test Stripe keys, AWS access keys, or GitHub personal-access tokens in the source set.

## Verification carried into this push

The implementation reports record these passing results against the source in this change set:

| Area | Result |
| --- | --- |
| Workspace typecheck | Pass, 9 tasks |
| Workspace lint | Pass, 7 tasks, no warnings |
| Workspace tests | Pass: platform 26, web 15, employee 3, Roku validation |
| Web production build | Pass, 83 routes |
| Reader iOS/Android exports | Pass |
| Employee iOS/Android exports | Pass |
| Apple TV/iOS and Android TV exports | Pass |
| Roku validator/typecheck | Pass |
| Platform build/conformance/demo/benchmark | Pass |
| C ABI/C++ smoke build | Pass with warnings treated as errors |
| Visual Feature Platform | Pass, 13 tests |
| Studio frontend | Pass, 6 tests, TypeScript, ESLint, production build |
| Studio Rust | Pass, 3 tests |
| Native Tauri release build | Pass |
| Browser verification | Pass for newspaper responsiveness, platform playground, and Visual Feature Composer workflows |

The final pre-push verification is recorded in the commit/push handoff. Native store signing, production Vercel resources, production migrations, domain associations, physical-device push delivery, and store submissions still require external credentials and infrastructure.

## Important remaining work

- Replace fictional seed reporting before enabling production indexing.
- Provision Clerk, Neon/Postgres, Blob, Upstash, Vercel environments, platform signing keys, and HMAC peppers.
- Apply and validate the database migrations in each deployed environment.
- Finalize employee application branding, icons, EAS ownership, signing, distribution model, and real installation URLs.
- Validate Universal Links/App Links and push notifications on physical devices.
- Move employee chat from polling to a socket/pub-sub transport only if operational needs justify the additional infrastructure.
- Complete native platform renderer/crypto integration beyond the current C ABI and Swift/Kotlin foundations.
- Continue the explicitly documented advanced Studio and Visual Feature Composer milestones.
- Run production backup/restore, penetration, accessibility, load, signing, installer, and release drills.
