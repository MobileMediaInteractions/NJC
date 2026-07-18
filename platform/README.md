# Platform Runtime

Platform Runtime is the neutral working name for a licensable feature-module system and deterministic application-animation runtime. It is a new workspace inside the existing monorepo, not a second repository or a permanent product brand.

The executable milestone is:

```text
.pani source -> parser -> semantics -> compiler -> FlatBuffers container
-> SHA-256 verification -> Ed25519 entitlement -> feature host
-> timeline/state machine -> render frame -> host event
```

Start with `pnpm platform:demo`, `pnpm platform:check`, `pnpm platform:benchmark`, and `pnpm --dir apps/platform-playground dev`.

## Repository map

- `src/core`: manifests, semver checks, lifecycle, capability broker, event bus, portable SHA-256.
- `src/licensing`: canonical receipts, Ed25519 signing/verification, reference service.
- `src/animation`: language, formatter, compiler, binary verifier, runtime and renderer boundary.
- `src/importers`: SVG conversion, validated Lottie-to-PANI translation, dotLottie compatibility reporting and image validation.
- `src/tooling`: editor language service; `tools/lsp` is the stdio LSP server.
- `schemas`: public JSON/FlatBuffers schemas.
- `sdks`: tested C ABI plus Swift/Kotlin ownership wrappers.
- `examples`: first-party and ordinary third-party proof.
- `docs`: decisions, contracts, guides, security and compatibility.

See [architecture](docs/architecture/overview.md), [current hosts](docs/compatibility/current-hosts.md), and [limitations](docs/compatibility/known-limitations.md).
