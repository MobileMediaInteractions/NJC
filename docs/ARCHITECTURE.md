# Harborline platform architecture

Harborline is organized by deployable target first, then by shared capability.

```text
apps/
  web/                 Next.js public site, CMS, legal pages and Vercel route handlers
  mobile/              One Expo codebase for iOS and Android
  tv/                  Shared react-native-tvos Apple TV and Android TV application
  roku/                Native SceneGraph/BrightScript Roku application
packages/
  api-client/          Typed, platform-neutral HTTP requester used by native clients
  backend/             Database connection and Drizzle schema
  contracts/           JSON/API contracts shared by every application
docs/                  Architecture, API, backup and pairing documentation
```

## Why the API lives with the web deployment

The public and authenticated API routes remain under `apps/web/src/app/api`. They are server-only Vercel Functions, not browser code. Keeping them in the same Next.js deployment provides same-origin cookies, one authentication boundary, atomic previews and a single set of environment variables. A second `apps/api` service would add CORS, cross-project secrets and deployment coordination without providing an operational benefit at the current scale.

Domain and persistence code is still separated from the route layer. Route handlers validate HTTP input and authorization; `@harborline/backend` owns database access; `@harborline/contracts` owns the public shapes; and `@harborline/api-client` owns cross-platform HTTP behavior.

## Vercel

Create the Vercel project from this repository and set its Root Directory to `apps/web`. Vercel will detect Next.js there and still resolve workspace packages from the repository root. The project-specific `vercel.json`, Drizzle migrations and portable-backup scripts live with that deployment.

## Native C and C++ policy

TypeScript remains the default for Next.js, iOS, Android and tvOS. Roku uses its supported SceneGraph/BrightScript runtime. Native C or C++ should be introduced only when measurement shows that JavaScript is the limiting factor, for example:

- on-device video or audio transforms;
- offline full-text indexing over a large downloaded archive;
- image analysis that cannot use a maintained platform library;
- a shared algorithm that must run identically on iOS, Android and tvOS.

When one of those cases exists, it belongs in a future `packages/native-core` CMake library behind React Native TurboModules. Cryptography should continue to use maintained platform or audited libraries rather than custom C/C++. Ordinary CMS, API, database and UI work should not use native code because it would reduce Vercel portability and increase memory-safety and release risk.

Roku does not consume that React Native native-core boundary. Add Roku-native extensions only when the Roku platform and distribution agreement explicitly support them and a measured product requirement cannot be met in BrightScript.
