# Repository audit — 2026-07-14

This audit treated the repository, current working tree, generated schema, and most complete implementation as the source of truth. Existing uncommitted New Jersey Courier branding, SEO, press-kit, responsive-theme, platform, and documentation work was preserved.

## Applications inspected

| Application | Runtime | Current purpose | Audit result |
| --- | --- | --- | --- |
| `apps/web` | Next.js 16 App Router on Vercel | Newspaper, Studio CMS, legal/developer pages, API, Postgres/Blob integration | Most complete product and backend surface; now also hosts employee APIs and association files |
| `apps/mobile` | Expo/React Native, iOS + Android | Reader news, saved stories, weather, video, account, pairing, alerts | Privileged quick-controls screen was removed; it now performs eligibility/access/install handoff |
| `apps/employee` | Expo/React Native, iOS + Android | Dedicated privileged employee client | New separate target with auth, chat, tools, updates, access, deep links, push and themes |
| `apps/tv` | Expo + `react-native-tvos`, Apple TV + Android/Google TV | Lean-back public news and secure device pairing | Current public/pairing scope retained; employee UI is not appropriate here |
| `apps/roku` | BrightScript/SceneGraph | Native Roku public news client | Current public scope retained; no TypeScript/native employee code can be shared into Roku |
| `apps/cdn` | Static Vercel project | Optional versioned brand-asset origin | Current same-origin/CDN-ready paths retained |
| `apps/platform-playground` | Next.js 16 | Standalone source compiler/runtime inspector | New isolated development app; production newspaper remains independent |

## Shared packages inspected

- `@harborline/contracts`: story/config/audience/pairing contracts; expanded with employee capabilities, access states, channel kinds, eligibility, and versioned deep-link parsing/building.
- `@harborline/api-client`: platform-neutral envelope/error requester reused by reader and employee apps.
- `@harborline/backend`: lazy Neon/Drizzle database connection and canonical schema; expanded by migration `0007_happy_beyonder.sql`.

## Existing systems and gaps found

- Clerk was already the web/mobile identity provider. Staff authorization used broad public-metadata roles and mobile-admin helpers; the database also contained user role and active state.
- The reader app contained a complete `/admin` quick-controls screen for metrics, editorial status, alerts, and live state. The web Studio remained the full CMS.
- Reader push registration and Expo alert fan-out existed. Employee-specific tokens, permission filtering, and safe internal previews did not.
- No WebSocket, SSE, Socket.IO, Firebase, Supabase Realtime, chat, presence, direct messaging, channel authorization, or access-request workflow existed.
- Reader deep linking used an Expo scheme. Employee Universal/App Links, app-install branching, link versioning, and domain associations did not exist.
- Audience reporting already separated web, iOS, Android, tvOS, Android TV, Roku, and developer API. The Employee App now reports through the same iOS/Android platform totals with `source=employee-app` so deployment metrics remain comparable without changing the public platform contract.
- Current native iOS/Android folders are generated and ignored; checked-in Expo configuration is authoritative. TV and Roku require their platform toolchains and release assets.
- Repository CI configuration was absent at audit time. `.github/workflows/platform-ci.yml` now checks platform/app builds, tests, schema/grammar conformance, C ABI, migration freshness, audit and benchmark thresholds.
- Weather radar, advertising/monetization, final EAS IDs, signing credentials, store records, and some Studio presentation values remain explicitly unfinished or externally configured.

## Dependency review

Expo's dependency check reported the reader dependencies compatible with SDK 57, with the repository's intentional `react-native-tvos` alias excluded. Available patch/minor updates included React, Reanimated, Safe Area Context, Screens, and Turbo; major updates also existed for ESLint, TypeScript, and gesture handling. They were not blindly upgraded because Expo-controlled native compatibility and the current clean build were higher-confidence sources of truth. A dedicated dependency-upgrade change should regenerate native projects and test every device target.

## Employee architecture implemented

- Separate bundle/application ID, scheme, EAS config, environment, navigation, secure token cache, push-device table, and release path.
- Shared Clerk identity, API client, contracts, theme values, and error conventions.
- Server capabilities layered over existing roles, with allow/deny/expiry/revocation grants and active-user checks.
- Postgres chat with membership authorization, cursor history, unread state, DMs/groups, mentions, replies, edits, soft deletes, pins, reports, presence/typing, private attachments, generic push, search, and audit events.
- Access requests prevent recent duplicate pending requests, self-review, replayed transitions, arbitrary capabilities, and client-forged approval. Approval creates a server grant and notification.
- Reader app handoff covers eligibility, missing app, missing configured distribution URL, access request, and retry. No store URL is invented.
- Compatibility mobile-admin endpoints remain available but enforce the new corresponding capabilities.
- Portable exports include all new employee tables and private chat files; tokens are removed/disabled in the exported dataset.

## Platform parity decisions

- Reader iOS and Android share the same Expo implementation and employee handoff.
- Employee iOS and Android share the same Expo implementation; Universal/App Link configuration is conditional on a real build host.
- Apple TV, Android TV, and Roku remain public lean-back clients. Adding chat or operational controls to television targets would violate the separation goal and is not considered a parity gap.
- The web Studio remains broader than mobile employee tools by design. The employee app includes only the existing quick operational functions plus communication/access foundations.
- Platform animation parity is not claimed for mobile/TV/Roku: the verified current host is web. Native crypto, renderer/JSI, focus and SceneGraph adapters remain explicit work in `platform/docs/compatibility/known-limitations.md`.

## Verification record

Verification commands and final results are recorded in the task handoff after all implementation checks. External signing, store submission, production database migration, domain association validation, and physical-device push delivery require credentials or infrastructure outside the repository.
