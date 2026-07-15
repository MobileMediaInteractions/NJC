# ADR 0001: Tauri 2 desktop shell

- Status: Accepted
- Date: 2026-07-14
- Decision owners: repository maintainers

## Context and evidence

The Studio is primarily a code-development environment: it needs Monaco, the existing TypeScript compiler/runtime, multiple native tool bridges, tightly scoped file access and supervised child processes. The repository already uses strict TypeScript and pnpm, while a current Rust 1.96 toolchain is available locally.

Official sources reviewed on 2026-07-14:

- [Tauri architecture](https://v2.tauri.app/concept/architecture/), [capabilities](https://v2.tauri.app/security/capabilities/), [official plugins](https://v2.tauri.app/plugin/), [webview versions](https://v2.tauri.app/reference/webview-versions/) and [distribution](https://v2.tauri.app/distribute/).
- [Qt supported platforms](https://doc.qt.io/qt-6/supported-platforms.html), [deployment](https://doc.qt.io/qt-6/deployment.html) and [licensing](https://doc.qt.io/qt-6/licensing.html).
- [Flutter desktop support](https://docs.flutter.dev/platform-integration/desktop).
- [Slint desktop support](https://docs.slint.dev/latest/docs/slint/guide/platforms/desktop/) and [renderer/backends](https://docs.slint.dev/latest/docs/slint/guide/backends-and-renderers/backends_and_renderers/).
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) and [updater behavior](https://www.electronjs.org/docs/latest/api/auto-updater/).
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) current browser support and MIT licensing.

## Comparison

| Criterion | Tauri 2 | Qt 6 | Flutter | Slint | Electron |
| --- | --- | --- | --- | --- | --- |
| Windows/macOS/Linux | Supported | Supported, configuration matrix varies | Supported | Supported on current vendor OSes | Supported |
| Editor/LSP fit | Excellent: Monaco and web LSP clients | Requires WebEngine or another editor component | No first-party Monaco; custom editor work | No Monaco; custom editor work | Excellent: Monaco and Node ecosystem |
| Existing runtime reuse | Direct TypeScript modules | Bridge or embed web content | Dart bridge/FFI | Rust/C++ bridge | Direct TypeScript modules |
| Native operations | Narrow Rust commands and capabilities | Native C++/Qt APIs | Dart plugins/FFI | Rust/C++ native | Node main process/preload IPC |
| Renderer/GPU canvas | WebGL/WebGPU/canvas plus Rust bridges | Strong Qt Quick scene graph | Strong Skia renderer | Strong lightweight renderer | Chromium WebGL/WebGPU/canvas |
| Multiple windows | Stable windows; multi-webview remains marked unstable | Mature | Supported with platform/plugin work | Supported | Mature |
| Terminal/process/LSP/DAP | Rust PTY/process crates and narrow IPC | C++ libraries/process APIs | Plugins/FFI | Rust crates | Broad Node ecosystem |
| Accessibility | Web accessibility plus OS webview; test per platform | Mature accessibility modules | Semantics layer | Improving | Chromium accessibility |
| Binary/memory/startup | Uses system webview; small shell expected | Native but deploys Qt/QML modules | Ships Flutter engine | Small native runtime | Bundles Chromium and Node; highest baseline |
| Auto-update/signing | Official updater; platform signing required | Application-defined | Community/platform tooling | Application-defined | Built in on macOS/Windows; Linux uses package manager |
| Security | Explicit window capabilities; dangerous commands blocked by default | Application-defined native boundary | Plugin/FFI boundary | Application-defined native boundary | Strong patterns possible, but a larger privileged runtime and continual Chromium/Node updates |
| Plugin architecture | Rust plugins plus planned WASM extension host | Mature Qt plugins | Federated plugins | Rust/C++ components | Broad npm/Node ecosystem |
| Licensing | MIT/Apache-2.0 ecosystem | GPL/LGPL/commercial choices; some modules GPL-only | BSD-3-Clause | Requires a separate GPL/commercial product review | MIT |
| Productivity here | Highest: React/Monaco + current TS + Rust | Large C++/QML rewrite | Large Dart rewrite | Large UI/editor rewrite | High, but materially larger runtime and attack/update surface |

## Prototype results

- Rust 1.96 and Cargo 1.96 are installed and can compile the native backend.
- Node 25 and pnpm 11 are installed; Monaco 0.55.1 and Tauri CLI 2.11.4 were current registry releases during the experiment.
- The existing animation compiler and runtime can be imported directly into a Vite browser build without a duplicate renderer.
- Full Xcode is **not** selected (`xcodebuild` and `simctl` are unavailable); the Studio reports this instead of claiming Apple builds work.
- ADB and Flutter are not installed; adapters report actionable unavailable states.

## Decision

Use Tauri 2 with a React/strict-TypeScript frontend and a Rust backend. Monaco hosts source editing. The authoritative TypeScript animation compiler/runtime runs in the trusted local webview. Rust owns canonical-path checks, filesystem writes, project detection, toolchain probes, Git and allow-listed task processes.

The frontend receives no Tauri filesystem or shell capability. Native access is exposed only through typed commands. The dialog plugin can select a folder or export target but cannot read arbitrary data by itself.

## Rejected alternatives

- **Electron:** viable fallback and excellent editor integration, but no blocker justified bundling Chromium/Node or accepting the larger update/security baseline.
- **Qt 6:** technically strong native UI and multi-window support, but Monaco would require Qt WebEngine, reuse of the TypeScript runtime becomes more complex, packaging is larger, and LGPL/GPL/commercial choices require additional compliance work.
- **Flutter:** strong renderer and desktop support, but would introduce Dart and require rebuilding code-editor/LSP integration or embedding a web editor.
- **Slint:** promising lightweight Rust UI, but not superior for a Monaco-centered IDE and would require substantially more editor/accessibility ecosystem work.

## Packaging and restrictions

- Build installers on their target CI operating system. Tauri documents MSI/NSIS for Windows, DMG/App Store bundles for macOS, and several Linux package formats.
- macOS distribution requires signing and notarization; Windows installers should be signed. Linux package signing depends on the format.
- The updater remains disabled until update artifacts and metadata are signed and a verified channel exists.
- System webviews vary: WebView2 on Windows and WebKit on macOS/Linux. Monaco and canvas behavior require the cross-platform CI/E2E matrix.
- Apple application builds/simulators require full Xcode and Apple SDKs on macOS. Android builds/devices require the Android SDK and ADB. The Studio is the control surface, not a replacement for those toolchains.
