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

The project detector is evidence-only. Marker files contribute a confidence score and an explanation; detection does not import manifests as executable code or invoke package scripts. The workspace model already supports multiple simultaneous detections and adapter tasks, while multi-root workspaces are a later extension.

Runtime preview uses the same TypeScript compiler, binary verifier, state machine and frame evaluator shipped by `@platform/runtime`. The DOM hybrid canvas is an editor renderer for the returned real frame, not a separately invented animation evaluator.
