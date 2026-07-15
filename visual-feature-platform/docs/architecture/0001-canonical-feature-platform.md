# ADR 0001: canonical typed Feature IR and hybrid runtime

- Status: accepted for the architectural vertical slice
- Date: 2026-07-14

## Evidence

The repository already has strict TypeScript, a deterministic animation compiler/runtime, a typed feature manifest, Ed25519 entitlement verification, a Tauri 2 Studio and pnpm workspaces. The Composer reuses those boundaries instead of replacing them.

Official documentation reviewed:

- [Tauri 2 capabilities](https://v2.tauri.app/security/capabilities/) for keeping filesystem and process access outside feature source.
- [pnpm workspaces](https://pnpm.io/workspaces) for an extractable package graph using the workspace protocol.
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12) for the portable Feature IR schema.
- [W3C APG keyboard-interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) for keyboard alternatives to pointer and drag operations.

## Decision

Use one canonical serializable `FeatureIR`. Design, Behavior, Data, Motion, Test and Code are projections and editors over that model. Stable IDs are explicit in the model and visible as `id` annotations in controlled source. The source is deterministic and parser-backed; it is not unrestricted natural language and is never evaluated as JavaScript.

Compile the validated IR into a bounded binary container holding canonical JSON, a manifest and SHA-256 checksums. Production hosts load verified packages. Generate host code only for route registration, permissions, service contracts and platform manifests that cannot be handled by the runtime.

## Dependency direction

```text
feature-model
  ↑          ↑
language   compiler
              ↑
           runtime
              ↑
      Studio / playground / hosts
```

The model does not import UI, network, platform or compiler code. The language has no runtime execution. The compiler has no host access. The runtime receives only explicitly registered host contracts.

## Synchronization

- Guided and graph edits mutate Feature IR commands.
- English is formatted from the IR.
- Supported English edits parse into a cloned IR and are validated before replacement.
- The current parser vertical slice updates feature metadata, component content and confirmation-node configuration while preserving stable IDs.
- Unsupported source construction reports a diagnostic instead of silently inventing behavior.

## Rejected approaches

- Independent canvas JSON, graph JSON and source: causes drift and broken references.
- Direct execution of English or LLM interpretation: ambiguous and unsafe.
- Large generated native UI trees for ordinary features: creates fragile diffs and platform drift.
- Arbitrary JavaScript expressions: violates deterministic capability boundaries.
- A second native desktop shell: the current Tauri Studio already has the correct trust boundary.

## Compatibility policy

The compiler reports unsupported component/platform combinations. Adapters must explicitly declare components, routes, services, models, actions, events, capabilities, tokens and entitlements. No arbitrary repository function becomes visually callable by discovery alone.
