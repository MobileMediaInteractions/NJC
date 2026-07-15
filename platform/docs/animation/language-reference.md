# Language reference (milestone grammar)

The implemented version is `language 1`. It supports packages, scenes, typed scalar inputs, text/rect/path/image/group/host components, scalar properties, timelines, property tracks, keyframes, easing names, state machines, transitions, emitted events, and one reduced-motion substitute timeline.

Implemented input types: number, integer, boolean, string, duration, percentage, angle, color. Implemented units: number, ms, s, percent, dp, sp, deg. Component properties are validated against the target host-property allowlist.

The larger design vocabulary—assets, themes, gradients, masks, constraints, gestures, nested/parallel machines, localization resources, accessibility variants and platform overrides—is reserved but not falsely described as implemented. Adding it requires grammar, semantic, binary, runtime and conformance changes together.

The formal milestone grammar is in `docs/animation-language/grammar.md`; editor grammar and LSP are in `tooling/` and `tools/lsp/`.
