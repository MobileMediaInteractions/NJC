# Push report — July 17, 2026

## Comparison baseline

This push is compared with `f0ee496` (`Build New Jersey Courier platform and Studio`), the commit currently published as `main` before this update. The GitHub repository was renamed from `MobileMediaInteractions/TheNews` to `MobileMediaInteractions/NJC`; its published `main` branch still points to the same baseline commit, so no remote history was replaced or reconciled.

## Studio desktop development environment

- Promoted NJC Studio from the earlier visual shell into a functional Tauri 2 desktop workflow with a canonical bundle identity, release configuration, icons and a hardened Rust release profile.
- Added animation creation templates, a searchable keyboard command palette, improved project Explorer behavior, clearer workspace trust, package inspection and toolchain diagnostics.
- Added an original, VS Code-familiar workbench layout without importing or forking VS Code itself.
- Added production configuration gates and a tagged artifact workflow with checksum generation.
- Documented the security boundary, architecture, release requirements and the measured policy for Rust, TypeScript, C/C++ and future GPU acceleration.

## Readable authoring and NJC Blueprints

- Expanded the Visual Feature Composer across synchronized Design, Blueprints, Data, Motion, Test and Code modes.
- Added a readable controlled-English authoring form that compiles into the same typed Feature IR as visual Blueprints.
- Added typed Blueprint nodes and ports, schema-aware node choices, synchronized inspection, keyboard movement and deterministic auto-arrangement.
- Added a bounded, cycle-safe Rust strongly connected component layout engine for large native graphs plus a contract-compatible browser fallback.
- Added the complete language and Blueprints guide, examples and documentation conformance tests.

## Saving, importing and exporting

- Added trusted-workspace disk autosave after editing inactivity, explicit save controls and visible save state.
- Tightened crash recovery so only dirty source is retained and a successful disk save cancels pending recovery timers.
- Added native macOS File-menu commands and cross-platform shortcuts for New, Open, Import, Save, autosave and export.
- Added bounded `.pani` source import and export.
- Added verified `.pani.bin` runtime-container export.
- Added deterministic runtime-frame rendering and native MP4 encoding at 24, 30 or 60 FPS. Rust validates PNG headers, dimensions, payload sizes and frame counts before invoking FFmpeg off the UI executor.
- Added an actual encoding test that produces an MP4 when FFmpeg is available.

## Documentation and screenshots

- Refreshed the desktop and mobile Courier homepage screenshots.
- Added current Studio workbench and export-workflow screenshots.
- Refreshed the Visual Feature Composer screenshot.
- Linked the new imagery from the root GitHub README, Studio README and Visual Feature Platform README.
- Added dedicated saving/exporting and production-readiness documentation.

## Verification completed before push

- `pnpm composer:check`
- Studio production configuration gates
- TypeScript typechecking and ESLint
- Studio React/Vitest tests
- Visual Feature Platform tests, build and demonstration
- Rust unit/integration tests and Clippy with warnings denied
- Optimized Tauri desktop build without installer bundling
- Desktop and compact browser inspection with no captured console warnings or errors
- `git diff --check`

## Remaining external release work

- Public desktop installers still require platform-owner signing, macOS notarization and Windows/Linux distribution validation.
- Public MP4 support requires either a documented FFmpeg dependency or a reviewed, licensed and signed FFmpeg sidecar.
- Store listings, signing credentials, update feeds and production service credentials remain owner-controlled and are not committed.
