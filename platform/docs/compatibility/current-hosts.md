# Current host compatibility matrix

Audited 2026-07-14 from repository configuration and local tool probes.

| Host | Framework/runtime | Language | Animation today | Platform Runtime milestone |
| --- | --- | --- | --- | --- |
| Web/public/Studio/API | Next.js 16.2.10, React 19.2.4, Vercel | TypeScript | CSS transitions/keyframes | Full compiler/server; DOM renderer; development showcase |
| Reader iOS/Android | Expo 57, React 19.2.3, RN/tvOS alias 0.86 | TypeScript | Reanimated dependency; minimal explicit use | Architecture compatible; production native crypto, renderer/JSI and showcase not implemented |
| Employee iOS/Android | Expo 57, React 19.2.3 | TypeScript | No animation framework usage | Licensing-admin controls added; production animation runtime/renderer not integrated |
| Apple TV / Android TV | Expo 57 + react-native-tvos | TypeScript | React Native UI | Package model compatible; renderer/focus/performance integration not implemented |
| Roku | SceneGraph | BrightScript/XML | SceneGraph properties | Package/receipt model only; renderer not implemented |
| CDN | Static Vercel output | Assets | None | Can distribute signed packages after cache/integrity policy is added |

Local toolchain: Node 25.2.1, Apple Clang 17, Swift 6.2.3; no Java runtime and no `flatc`. Native Android/Kotlin builds and generated FlatBuffers freshness therefore require CI or local toolchain installation.

No existing licensing, feature-module lifecycle, package verifier, animation DSL, Lottie/Skia integration, animation state machine or WebAssembly component host was found. Existing application feature flags are ordinary public configuration booleans and are not remotely executable modules.
