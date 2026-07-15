# Platform Studio implementation report

- Date: 2026-07-14
- Scope: desktop animation and feature-platform Studio architectural vertical slice
- Product name: neutral working name derived from the repository; no permanent brand was invented
- Status: working vertical slice, not a claim that the complete multi-milestone IDE is finished

## Outcome

The repository now contains a native desktop Studio under `tools/studio`. It can open and inspect a real workspace, edit ordinary source and `.pani` animation files in Monaco, compile a production animation package with the authoritative platform compiler, run that package with the authoritative runtime in an integrated virtual device, visually edit component properties and timeline keyframes back into source, drive and inspect a state machine, save atomically, recover unsaved work, and invoke fixed repository tasks after explicit workspace trust.

The Studio deliberately labels its built-in phone as a **virtual preview**. It is not described as an Android emulator or Apple Simulator. Real emulator/device orchestration remains a later milestone and still requires the vendor SDKs.

## Framework decision and research

Tauri 2 was selected with:

- Rust for the privileged native boundary.
- React and strict TypeScript for the interface.
- Monaco for source editing.
- The repository's existing animation parser, compiler, package verifier and runtime rather than a second renderer or duplicate model.

The decision is documented with official-source evidence and a comparison of Tauri, Qt 6, Flutter, Slint and Electron in [ADR 0001](architecture/0001-desktop-framework.md). The deciding factors were direct reuse of the TypeScript platform and Monaco, a small system-webview shell, narrowly scoped Tauri commands/capabilities and the ability to keep filesystem/process access in Rust. Electron remains viable but did not justify its bundled Chromium/Node baseline; the other choices would require rebuilding the editor integration or the existing TypeScript runtime bridge.

The experiment used current registry releases available on 2026-07-14: Tauri CLI 2.11.4, Tauri API 2.11.1, Monaco 0.55.1, Vite 8.1.4 and Vitest 4.1.10.

## Architecture

```text
tools/studio/
  src/                         React/TypeScript IDE frontend
    app/                       application shell and orchestration
    canvas/                    runtime-backed visual scene
    editors/                   Monaco and animation language integration
    graph/                     state-machine view and trace controls
    hooks/                     command history and recovery
    panels/                    inspector and IDE bottom panels
    preview/                   actual-runtime virtual device
    project-system/            accessible explorer
    timeline/                  keyframe/timeline editing
    lib/                       typed desktop bridge and structured source edits
    demo/                      built-in `.pani` and licensed feature manifest
  src-tauri/
    src/main.rs                trusted native boundary and adapters
    capabilities/main.json     minimal main-window permissions
    tauri.conf.json            desktop window, CSP and package metadata
  tests/                       workflow, manifest and accessibility tests
  docs/                        ADR, security, architecture and user/release guides
```

The frontend receives no filesystem or shell plugin capability. It can request only typed native commands. The Rust side owns path canonicalization, bounded file access, safe writes, workspace trust, project detection, toolchain probes, Git status and fixed task execution.

The canonical animation artifact remains `.pani` source. Visual edits locate parser-derived component/keyframe spans and apply targeted text edits, preserving comments and unrelated formatting. Compiled FlatBuffers bytes are generated from the source and immediately consumed by the real `AnimationRuntime` in the preview.

## Repository changes

- Added `tools/*` to the pnpm workspace.
- Added root commands: `studio:start`, `studio:web`, `studio:check` and `studio:build`.
- Added `tools/studio` and its Tauri, React, Monaco, test and documentation configuration.
- Added a neutral Studio SVG/icon set and platform icon assets.
- Added a Studio verification job to `.github/workflows/platform-ci.yml`.
- Added `.github/workflows/studio-packages.yml` for unsigned review bundles on macOS, Windows and Linux.
- Linked the Studio from the root repository README.
- Did not rewrite or discard unrelated application work already present in the dirty worktree.

## Working features

### Workspace and project system

- Select a folder through the native dialog.
- Locate the current repository automatically for the default workspace.
- Inspect workspace markers without running project code.
- Confidence-scored detection with evidence for the animation platform, pnpm monorepos, Turborepo, Next.js, Expo, Rust/Cargo, CMake, CI and Git.
- Bounded explorer: at most 2,500 entries, depth 7, with generated, dependency, VCS and secret-prone paths excluded.
- Read UTF-8 text files up to 2 MiB and reject binary/oversized files.
- Explicit in-memory workspace trust before writing, Git inspection or task execution.

### Source and language editing

- Lazy-loaded local Monaco editor; no remote CDN dependency.
- Standard Monaco multi-cursor, bracket matching, find/replace and editor navigation.
- `.pani` syntax coloring.
- Parser-backed diagnostics, completion, hover, go-to-definition, document symbols and formatting from `AnimationLanguageService`.
- JSON and TypeScript language modes for ordinary project files.
- Unsaved indicator, undo, redo and keyboard shortcuts.
- Local recovery snapshot for the active document.
- Hash-based external-change detection on save.
- Temporary-file write, sync and atomic replacement in Rust.

### Real compiler/runtime workflow

- Compile current `.pani` source through `compileAnimation`.
- Generate the actual FlatBuffers animation package.
- Verify and unwrap packages in automated tests.
- Render the integrated preview using `AnimationRuntime`.
- Display compiler/package metadata: minimum runtime, compiler version, source hash, required features, scenes, timelines, machines and bytes.
- Surface compiler failure without silently substituting fake content.

### Visual, timeline and state editing

- Runtime-backed visual canvas and layer selection.
- Schema-informed scalar property controls for the selected compiled component.
- Targeted component-property edits back into `.pani` source.
- Timeline selection, play, seek and keyframe time/value/easing edits back into source.
- Active state highlighting.
- Manual event dispatch through the actual runtime state machine.
- Accepted/rejected transition trace and emitted runtime events.
- Runtime input editing.
- Source changes recompile and refresh the preview.

### Virtual device and appearance

- Compact phone, large phone and tablet presets.
- Portrait/landscape rotation.
- Light/dark preview.
- Reduced-motion input.
- Safe-area and rounded-device presentation.
- Click/touch-style component selection and interactive state controls.
- Real runtime frames, frame count, frame/evaluation timing and calculated FPS.

### Development and platform panels

- Problems, output, finite task terminal, performance, Git, package, workspace, license and device/toolchain panels.
- Allow-listed adapters for the platform demo/check, playground example build, Studio check and web build when the corresponding project is detected.
- Command, argument array, working directory and environment-change summary shown before a task.
- Real platform signed-entitlement demonstration available from License Lab after trust.
- Other license failure scenarios are honestly labeled preview-only.
- Toolchain diagnostics for Rust, Node, Xcode, ADB and Flutter.
- Read-only Git branch/status after trust.
- Command palette and keyboard-accessible major actions.
- Resizable/toggleable explorer, inspector and bottom panel.
- Dark and light Studio themes with visible focus treatment.

## Built-in demonstration

`src/demo/onboarding.pani` includes:

- Responsive onboarding scene.
- Interactive button.
- Loading, entrance, completion, error and reduced-motion timelines.
- Loading, ready, complete and error state-machine states.
- Bound counter and user-name inputs.
- Spring easing.
- Path-style property animation.
- Light/dark theme input.
- Native host component declaration.
- Comments used to verify structured-edit preservation.

`src/demo/licensed-feature.json` is a licensed example module that passes the authoritative feature-manifest parser and declares animation capability and the `studio.demo` entitlement.

## Security controls

- Tauri capabilities contain only `core:default`, folder/file open and save dialogs.
- No frontend filesystem plugin and no frontend shell plugin.
- Content Security Policy restricts content, image, connection and worker sources.
- Canonical workspace roots and canonical child paths.
- Parent traversal and workspace/symlink escape rejection.
- File, explorer and process-output bounds.
- Writes require trust and the previously read SHA-256.
- Atomic replacement prevents partially written source.
- Project detection reads markers only and never executes project scripts.
- Tasks are adapter-owned fixed executable/argument arrays; the frontend cannot submit a shell string.
- Task output redacts common database/payment/auth credential markers and is truncated at 512 KiB.
- Git and task commands require workspace trust.
- Signing keys are not present in the frontend.
- Production auto-update remains disabled.

See [the threat model](security/threat-model.md) for covered threats and remaining hardening work.

## Verification results

Final command:

```bash
pnpm studio:check
```

Passed on macOS:

- Vitest: 3 files, 5 tests passed.
- TypeScript project build: passed with strict configuration.
- ESLint: passed with no warnings.
- Vite production build: passed.
- Cargo tests: 3 tests passed.
- Shared animation/feature platform: 26 tests passed, typecheck passed and package build passed.
- Signed platform vertical-slice demo: ran successfully through parser, compiler, FlatBuffers package verifier, Ed25519 entitlement, runtime, state machine and renderer-frame stages.
- Example application adapter target: the platform playground passed typecheck, lint and its Next.js production build.

Tested behavior includes:

- Real compile, package verification, runtime preview and state transition.
- Component-property source round trip with comment preservation.
- Keyframe/easing edit followed by recompilation.
- Licensed example feature-manifest schema validation.
- Keyboard-accessible explorer structure.
- Native traversal rejection.
- Marker-only project detection.
- Credential redaction.

Manual browser verification at 1,280 x 720 and 1,512 x 982 confirmed:

- No application error overlay.
- No browser console warnings or errors.
- No horizontal page overflow.
- Monaco loaded successfully.
- Eight runtime preview nodes rendered.
- Inspector edit changed `title.x` from 30 to 44 and updated valid source.
- Undo restored the value to 30.
- Runtime event moved the active state from `loading` to `ready` and recorded an accepted trace.
- Problems remained empty for the valid project.

The checked screenshot is [studio-visual.jpg](screenshots/studio-visual.jpg).

## Native build and measurements

Command:

```bash
pnpm studio:build
```

Result:

- Native macOS release executable built successfully with `tauri build --no-bundle`.
- Executable: `tools/studio/src-tauri/target/release/platform-studio`.
- Executable size: 10,844,032 bytes (approximately 10.3 MiB).
- Clean native release compilation observed during this pass: approximately 1 minute 24 seconds for Cargo, 88.87 seconds wall time for the full command.
- A subsequent incremental native release build after formatting completed in 23.69 seconds wall time.
- The macOS timing tool reported a peak memory footprint of 128,019,760 bytes during the incremental build. This is build-process memory, not measured steady-state Studio runtime memory.

Frontend production assets:

| Asset | Minified | Gzip |
| --- | ---: | ---: |
| Main application JavaScript | 276.46 KiB | 87.81 KiB |
| Lazy Monaco editor JavaScript | 2,572.82 KiB | 673.48 KiB |
| Monaco editor worker | 355.43 KiB | not reported |
| Main CSS | 26.90 KiB | 6.03 KiB |
| Monaco CSS | 74.48 KiB | 11.77 KiB |

Monaco is separated into a lazy chunk so the main shell does not eagerly parse it. The 2.57 MiB Monaco chunk still triggers Vite's large-chunk warning and remains a concrete performance priority. Startup time and steady-state memory were not instrumented reliably enough in this environment and are not claimed.

## Commands

```bash
# Native desktop development
pnpm studio:start

# Browser-only interface development with explicit demo-only native fallbacks
pnpm studio:web

# Tests, typecheck, lint, web production build and Rust tests
pnpm studio:check

# Native release executable without an installer bundle
pnpm studio:build

# Native installer/package on a properly provisioned target OS
pnpm --dir tools/studio tauri build
```

## Platform and external-toolchain requirements

- Desktop development requires Node, pnpm, Rust/Cargo and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for the host OS.
- Apple builds and Simulator control require macOS, full Xcode, the required Apple SDKs and applicable signing. Command Line Tools alone do not provide `xcodebuild`/`simctl`.
- Android builds, emulators and devices require the Android SDK, configured AVDs and ADB.
- Flutter tooling is required only for a detected Flutter project.
- Platform signing identities, Apple notarization credentials, Windows signing certificates and a Linux package-signing policy are external release inputs.
- A signed update channel and keys are required before enabling auto-update.

The local machine had Rust, Cargo, Node, pnpm and CMake. Full Xcode was not selected; ADB and Flutter were unavailable. Consequently no Apple Simulator, Android emulator, Flutter target or physical device was launched, and no claim otherwise is made.

## Packaging and CI

The local native executable was built successfully. `.github/workflows/studio-packages.yml` defines native bundle builds on macOS 14, Windows and Ubuntu 24.04 and uploads the generated bundles for review. That workflow has been added but was not executed from this local environment, so Windows/Linux package success is not yet claimed.

The CI artifacts are deliberately unsigned review builds. Production distribution still needs:

- macOS signing and notarization.
- Windows code signing.
- A selected and verified Linux package/signing policy.
- Release provenance and artifact verification.
- Signed update metadata before an updater is enabled.
- Rollback and release-channel operational tests.

See [the packaging guide](release/packaging.md).

## Known unfinished functionality

The requested document describes a mature IDE across six milestones. This implementation completes a usable core vertical slice and foundations for later milestones; it does not pretend the following are complete:

- Full cross-platform interactive PTY, multiple terminal tabs, ANSI terminal emulation and long-running process supervision. Current tasks are finite and allow-listed.
- Generic language-server process hosting and Debug Adapter Protocol. `.pani` intelligence is currently an in-process parser-backed service.
- Android emulator/physical-device start, install, launch, log streaming and debug bridge.
- Apple Simulator start, install, launch, log streaming and debug bridge.
- Managed external emulator windows or safe embedding.
- Multiple editor tabs, split/diff/history editors, project-wide search and quick-fix/refactor UI.
- Full docking, saved layouts, full-screen preview and multiple windows.
- Visual multi-selection, grouping, alignment/distribution, guides/rulers, transform handles, constraints, paths, masks, gradients, text/image placement, reusable symbols, localization and RTL preview.
- Timeline dope-sheet multi-selection, clips, nesting, copy/paste, tangent curve editor, audio cues, markers and conflict visualization.
- State conditions, timers, priorities, interruption/blending, nested machines and parallel layers not supported by the current runtime model.
- Fully schema-driven inspector for all requested value kinds, mixed selection, binding/keyframe affordances and platform/accessibility overrides.
- Real network/loading simulation and complete gesture/keyboard simulation.
- Compiler watch/incremental host, optimization/compatibility reports, package signing UI, deterministic comparison and package export/diff workflows.
- Complete feature-module capability editor, dependency graph, mock host, package builder/signature verifier and migration tester. The current slice opens the real manifest and validates the demo in tests.
- Production licensing authentication and authorized disposable-license administration. Only the repository's real signed demo is executable; other scenarios are visibly preview-only.
- Package extraction, archive-limit enforcement, asset/chunk/source-map tables and binary package comparison.
- Bounded performance-trace export and GPU-specific metrics.
- Multiple-document autosave policy, crash-process simulation, external-file merge UI and durable layout/settings persistence.
- Git diff/stage/unstage/commit/discard/conflict flows. Only trusted read-only status is implemented.
- Executable extension host, WASM component sandbox and signed extension marketplace. The manifest direction is documented only.
- Production secure token storage, dependency-audit automation, signed deep links and signed auto-updates.
- Complete UI, backend, integration, end-to-end desktop, emulator/device and cross-platform accessibility test matrix.
- Locally proven Windows/Linux installer packages and signed/notarized production distribution.

## Exact next implementation priorities

1. Split the Rust backend into testable workspace, process, task-adapter and device-bridge modules; add persistent trust records scoped to workspace identity and Studio version.
2. Add a supervised cross-platform PTY and cancellable long-running task model with process groups, bounded logs and explicit shutdown handling.
3. Implement standard LSP process supervision plus an out-of-process `.pani` language server; then define the runtime debug protocol and DAP adapter.
4. Build Android SDK/AVD/ADB and macOS Xcode/simctl adapters on properly provisioned CI/dev machines, using managed external emulator windows first.
5. Expand the CST edit layer and command model to full visual manipulation, multi-document undo, autosave policy, external-change merge and crash recovery tests.
6. Implement schema-driven feature-manifest editing, compatibility/dependency resolution, development host and package signature verification.
7. Complete the licensing simulator with authorized backend APIs and secure native token storage; never put signing private keys in the Studio.
8. Add safe package extraction with decompression, count and size budgets and full package/chunk/source-map inspection.
9. Add focused Git diff/stage/commit workflows with confirmation and generated-file awareness.
10. Implement the signed WASM extension runtime and capability grants only after the extension threat model and signature format are finalized.
11. Add Playwright/WebDriver desktop E2E, accessibility automation, startup/memory benchmarks and real Windows/Linux/macOS package tests.
12. Configure signing, notarization, provenance, update-channel integrity and rollback exercises before calling any package production-ready.

## Bottom line

The repository now has a real, native, security-bounded Studio workflow rather than a canvas mockup or folder skeleton. The end-to-end animation path—open, edit, compile, verify, run, visually change, update source, drive state and build an example through a trusted adapter—is operational and tested. The larger IDE, device, extension and signed-distribution surface remains explicitly staged above and should not be represented as complete until those code paths and target platforms are built and verified.
