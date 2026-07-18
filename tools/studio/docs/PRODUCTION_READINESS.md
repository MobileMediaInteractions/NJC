# NJC Studio production readiness

Last verified: 2026-07-17

## Repository release gates

`pnpm studio:check` now verifies production metadata before running tests, TypeScript, ESLint, the web production build and Rust tests. The production gate checks:

- canonical product, npm package and application identities;
- matching npm, Tauri and Cargo versions;
- native bundling configuration and required icon formats;
- a non-wildcard CSP without `unsafe-eval`;
- the minimal Tauri capability allowlist and absence of frontend shell/filesystem permissions;
- hardened Cargo release settings;
- bounded native Blueprint graph limits, off-thread execution and Rust test coverage;
- bounded source, runtime-package and frame payloads, real FFmpeg MP4 encoding coverage, and off-UI-thread video encoding;
- native File-menu coverage for save, autosave, import and all three export formats;
- CI test and checksum steps.

Native release builds use LTO, one code-generation unit, size optimization, symbol stripping and abort-on-panic. Tagged CI builds execute the complete Studio check before packaging and include `SHA256SUMS.txt` with every platform artifact.

The Blueprint editor's Auto arrange action uses the deterministic `rust-scc-layered-v1` service in Tauri. Strongly connected components prevent cyclic graphs from failing or recursing indefinitely, and the service rejects oversized or invalid requests before allocation-heavy processing. Browser previews use the labeled TypeScript reference fallback. See [the native acceleration decision](architecture/0002-native-acceleration.md) for the measured Rust/C++/GPU boundary.

## Security model

The React/Monaco frontend cannot invoke a general shell or arbitrary filesystem APIs. Rust owns canonical path validation, bounded reads, trusted-workspace writes, symlink containment, allow-listed task execution, Git status and output redaction. Feature source and Blueprints compile to typed Feature IR; neither authoring style can execute native code.

## Required external release operations

The repository can produce release candidates, but public production distribution still requires owner-controlled credentials and services that must not be committed:

- Apple Developer signing identity, hardened-runtime entitlements and notarization credentials for macOS;
- an Authenticode certificate for Windows installers;
- signing and repository metadata for the chosen Linux distribution channel;
- final application ownership, privacy/support URLs and store listings;
- a signed update feed and rollback policy before enabling automatic updates;
- release validation on clean physical or virtual Windows, macOS and Linux machines;
- accessibility, long-session memory, upgrade and disaster-recovery acceptance testing.

Unsigned CI artifacts are internal release candidates only. They must not be presented as publicly trusted installers.

Rendered MP4 export currently discovers a system FFmpeg installation and prefers `h264_videotoolbox` on macOS, then `libx264`, then MPEG-4. A public installer must either document this dependency or ship a separately reviewed and signed FFmpeg sidecar whose exact build, codecs, license notices, checksums and update policy are owned by the release process. The repository intentionally does not silently bundle an arbitrary encoder binary.

## Release commands

```bash
pnpm studio:production
pnpm studio:check
pnpm composer:check
pnpm studio:build
```

For installer bundles, run `pnpm --dir tools/studio tauri build` on the intended target operating system with its signing environment configured.
