# Visual Feature Platform threat model

## Trust boundaries

- Editable feature source and packages are untrusted input.
- Component, connector and action plugins are untrusted until signed and granted capabilities.
- Network and live-media responses are untrusted.
- The host application owns credentials, native services, entitlement verification and privileged capabilities.
- Tauri filesystem/process commands remain outside Feature IR and controlled English.

## Implemented controls

- Formal typed model; no unrestricted natural-language interpreter.
- No arbitrary JavaScript, shell, filesystem or dynamic imports in feature source.
- Stable references and typed graph ports; incompatible edges are compiler errors.
- Duplicate identity, missing reference, accessibility and binding-cycle diagnostics.
- HTTPS-only connector policy outside localhost development.
- Host credential references use `host:<id>`; credentials are not serialized into packages.
- Feature package magic, version, length, SHA-256 and semantic verification.
- 16 MiB package, 500 component and 1,000 behavior-node limits.
- Runtime entitlement and capability checks before state initialization.
- 256-step behavior execution bound and 500-entry runtime trace bound.
- Cancellation through `AbortController` for connector actions.
- 10,000-event hard limit for live-data recording, configured redaction and bounded replay speed.
- Server-owned state rejects direct client mutation.
- Platform compatibility diagnostics do not silently substitute unsupported implementations.

## Remaining hardening

- Signed plugin/package trust roots and revocation.
- WASM component sandbox for third-party deterministic extension logic.
- Streaming media byte, decode and resolution budgets in native adapters.
- Connector SSRF controls based on resolved addresses and host deployment policy.
- Archive extraction and decompression-bomb protection when package assets are added.
- Persisted secure-state integration with native keychain/keystore adapters.
- Rate limits, backpressure and resume-token tests against real WebSocket/SSE adapters.
- Generated-code escaping tests for every host adapter.
- Fuzzing of source parser, package decoder, bindings and graph validator.
