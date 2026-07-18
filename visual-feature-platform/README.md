# Visual Feature Platform

This extraction-ready workspace extends NJC Studio with a Visual Feature Composer. It provides a real canonical feature model, readable English-programming projection/parser, interactive NJC Blueprints, deterministic package compiler/verifier, entitlement-aware runtime, connector contracts, guided testing, live-event recording and a standalone playground.

It is a working architectural vertical slice, not a claim that the complete nine-milestone product in the initiative is finished.

![Visual Feature Composer in Platform Studio](../docs/screenshots/visual-feature-composer.png)

## Packages that contain implementation

```text
visual-feature-platform/
  apps/feature-playground/       standalone React/Vite package host
  packages/feature-model/        canonical Feature IR, component schemas and validation
  packages/feature-language/     deterministic readable source and language services
  packages/feature-compiler/     canonical compiler, compatibility report and package verifier
  packages/feature-runtime/      behavior runtime, host/connectors, tests and live recorder
  examples/                      purchase and live-information feature sources
  schemas/feature/               JSON Schema 2020-12 Feature IR contract
  docs/                          architecture, language, security, integration and extraction
  tests/                         cross-package conformance and performance smoke tests
```

No empty packages were created to imitate the target architecture. New packages should be split out only when an implemented responsibility has an independent API, ownership and release need.

## Run

From the repository root:

```bash
pnpm install
pnpm composer:check
pnpm composer:demo
pnpm composer:playground
pnpm studio:web
```

The playground runs on `http://127.0.0.1:1430`. Open the desktop Studio's **Feature** tab for Design, Behavior, Data, Motion, Test and Code modes.

## Proven workflow

```text
component schema / drag or keyboard add
→ canonical Feature IR
→ readable source + typed NJC Blueprints
→ semantic and security validation
→ deterministic VFC package + SHA-256 verification
→ entitlement/capability-gated runtime
→ standalone playground and Studio preview
→ recorded interaction test and bounded trace
```

See [the implementation report](docs/IMPLEMENTATION_REPORT_2026-07-14.md), [architecture ADR](docs/architecture/0001-canonical-feature-platform.md), [complete language and Blueprints guide](docs/language/authoring-language-and-blueprints.md), [language grammar summary](docs/language/controlled-english.md), [security model](docs/security/threat-model.md), and [extraction guide](docs/release/extraction.md).
