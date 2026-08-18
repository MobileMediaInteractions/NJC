# `@visual-feature/compiler`

The deterministic compiler validates Feature IR, produces a canonical package,
records compatibility diagnostics, hashes source and feature payloads, and
verifies bounds and checksums before runtime loading.

![Compiler workbench in dark mode](../../../docs/screenshots/dark/platform-playground.jpg)

Compiler output is data, not executable arbitrary code. Package verification
must succeed before a host can evaluate entitlements and capabilities.
