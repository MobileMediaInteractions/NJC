# ADR 0003: hybrid rendering with a mature 2D backend

Status: accepted — 2026-07-14

## Evaluation

- Platform-native views best preserve semantics, text input, accessibility and existing component ownership, but supported properties vary by adapter.
- Skia provides a mature cross-platform 2D renderer and currently supports the repository's React/React Native versions, iOS, Android, web through CanvasKit, and Apple/Android TV. Its documented binary cost is material, and TV support is not fully tested.
- wgpu is attractive for portable GPU work but would make text shaping, path rasterization, images and native-view animation our responsibility.
- A hybrid permits engine-owned vector scenes through Skia and host-owned UI through explicit native/DOM adapters.

## Decision

Adopt a hybrid protocol. The first milestone implements a DOM renderer and a framework-neutral host-property adapter so the pipeline is measurable without adding several megabytes to every first-party app. Add React Native Skia as an optional renderer package only after native bundle, startup and TV measurements pass budgets. Do not use wgpu for the initial 2D path.

React Native Skia documents React Native >=0.79/React >=19 requirements, Expo installation, web CanvasKit loading, TV support, and expected bundle costs: <https://shopify.github.io/react-native-skia/docs/getting-started/installation/>.
