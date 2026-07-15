# ADR 0001: workspace and implementation languages

Status: accepted — 2026-07-14

## Context

The repository is a pnpm/Turbo monorepo. Next.js and Expo targets are TypeScript; Roku is BrightScript/SceneGraph. Clang and Swift are available locally, but Java is not. There is no existing native shared-core package.

## Decision

Create one top-level `platform` workspace with strict TypeScript core logic and no nested Git repository. Keep public model/runtime code framework-neutral. Define a versioned C ABI for long-term native stability and provide small Swift/Kotlin wrapper sources that can compile once host toolchains are configured. Do not force Roku to embed a TypeScript engine; Roku integration requires a separately measured BrightScript or native-channel adapter after the portable ABI stabilizes.

## Consequences

The first vertical slice can run in the current web and JavaScript-native targets. C/Swift compile checks are locally possible; Kotlin/Android checks require a JDK. Native render-thread performance remains a later measured migration, not an unsupported claim.
