# New Jersey Courier platform architecture

The Courier is organized by deployable target first, then by shared capability.

```text
apps/
  web/                 Next.js public site, CMS, legal pages and Vercel route handlers
  mobile/              One Expo codebase for iOS and Android
  employee/            Separate privileged Expo codebase for employee iOS and Android
  tv/                  Shared react-native-tvos Apple TV and Android TV application
  roku/                Native SceneGraph/BrightScript Roku application
  cdn/                 Canonical versioned assets; optional standalone Vercel origin
packages/
  api-client/          Typed, platform-neutral HTTP requester used by native clients
  backend/             Database connection and Drizzle schema
  contracts/           JSON/API contracts shared by every application
docs/                  Architecture, API, backup and pairing documentation
```

## Why the API lives with the web deployment

The public and authenticated API routes remain under `apps/web/src/app/api`. They are server-only Vercel Functions, not browser code. Keeping them in the same Next.js deployment provides same-origin cookies, one authentication boundary, atomic previews and a single set of environment variables. A second `apps/api` service would add CORS, cross-project secrets and deployment coordination without providing an operational benefit at the current scale.

Domain and persistence code is still separated from the route layer. Route handlers validate HTTP input and authorization; `@harborline/backend` owns database access; `@harborline/contracts` owns the public shapes; and `@harborline/api-client` owns cross-platform HTTP behavior.

## Privileged employee boundary

`apps/employee` is a distinct application target with its own package, bundle/application ID, scheme, EAS profiles, navigation, push registry, and release configuration. It shares the identity provider, API requester, contracts, and visual tokens, but not reader screens or client-side administrative authority. The reader app only checks eligibility, requests access, and hands a versioned allow-listed destination to the employee app.

Every employee request recomputes effective capabilities from the active database user, role defaults, explicit allow/deny grants, expiry, and revocation. Private/direct channel access additionally requires current membership. Deep links and notification taps resolve through the same server authorization path.

Internal chat uses Postgres-backed cursor polling at launch. This is a near-real-time, reconnectable transport chosen to fit the existing Neon and Vercel deployment without introducing a second real-time vendor. The mobile transport is isolated behind API calls so WebSockets or a managed pub/sub transport can replace polling later without changing stored messages or authorization rules.

## Vercel

Start with one Vercel project whose Root Directory is `apps/web`. Vercel supplies production and preview `*.vercel.app` URLs, which the server detects automatically. Brand assets are mirrored into the web deployment and use same-origin `/assets` paths. No DNS or public URL environment variable is required.

The `apps/cdn` project is an optional later split. It can first use its own Vercel-generated hostname and eventually receive `cdn.<domain>`. `NEXT_PUBLIC_ASSET_ORIGIN` switches clients to that origin without changing versioned paths. When a primary custom domain is attached, `NEXT_PUBLIC_SITE_URL` establishes it as the canonical metadata, sitemap and API-documentation origin.

## Native C and C++ policy

TypeScript remains the default for Next.js, iOS, Android and tvOS. Roku uses its supported SceneGraph/BrightScript runtime. Native C or C++ should be introduced only when measurement shows that JavaScript is the limiting factor, for example:

- on-device video or audio transforms;
- offline full-text indexing over a large downloaded archive;
- image analysis that cannot use a maintained platform library;
- a shared algorithm that must run identically on iOS, Android and tvOS.

When one of those cases exists, it belongs in a future `packages/native-core` CMake library behind React Native TurboModules. Cryptography should continue to use maintained platform or audited libraries rather than custom C/C++. Ordinary CMS, API, database and UI work should not use native code because it would reduce Vercel portability and increase memory-safety and release risk.

Roku does not consume that React Native native-core boundary. Add Roku-native extensions only when the Roku platform and distribution agreement explicitly support them and a measured product requirement cannot be met in BrightScript.
