# Studio architecture

```text
React / Monaco / visual tools
            │ typed invoke commands only
            ▼
Tauri 2 Rust boundary
  ├─ workspace inspection and trust
  ├─ canonical filesystem and atomic writes
  ├─ confidence-scored project detectors
  ├─ allow-listed task adapters
  ├─ toolchain and device diagnostics
  ├─ deterministic Blueprint graph engine (worker pool)
  ├─ bounded atomic source/runtime exports
  ├─ staged PNG frames → off-thread FFmpeg MP4 encoder
  └─ bounded Git/process output
            │
            ├──────────────► project-native tools
            │                 pnpm, Cargo, CMake, future Gradle/Xcode
            ▼
@platform/runtime
  parser → semantic analysis → compiler → FlatBuffers package
  verifier → animation runtime → render frame → Studio canvas/device
```

The animation source remains canonical. Visual changes use lexer tokens and source spans to replace only the selected scalar or keyframe token. They do not reformat the file or discard comments. A future CST layer should add stable node IDs, comment attachment and conflict-aware compound transformations.

NJC Blueprints and readable source project the same canonical Feature IR. Large Blueprint auto-layout requests cross a bounded typed contract to the cycle-safe Rust engine; browser development uses the compatible TypeScript reference implementation. Native acceleration does not create a second compiler. See [ADR 0002](0002-native-acceleration.md).

The project detector is evidence-only. Marker files contribute a confidence score and an explanation; detection does not import manifests as executable code or invoke package scripts. The workspace model already supports multiple simultaneous detections and adapter tasks, while multi-root workspaces are a later extension.

Runtime preview uses the same TypeScript compiler, binary verifier, state machine and frame evaluator shipped by `@platform/runtime`. The DOM hybrid canvas is an editor renderer for the returned real frame, not a separately invented animation evaluator.

MP4 export also drives that runtime deterministically at exact timeline timestamps. The frontend paints the returned render nodes to isolated PNG canvases; the native boundary validates the count, byte size, dimensions and PNG headers before staging frames and running an argument-array-only FFmpeg process away from the UI executor. Source, runtime package and completed video files are finalized atomically.
