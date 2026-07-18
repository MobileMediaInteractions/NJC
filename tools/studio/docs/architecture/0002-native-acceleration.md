# ADR 0002: Measured native acceleration

- Status: Accepted
- Date: 2026-07-17
- Decision owners: repository maintainers

## Context

NJC Studio needs Unreal-style visual authoring to remain responsive as projects grow. The desktop shell already has a narrow Rust boundary, while the canonical animation and Feature compilers are TypeScript packages shared with web tooling. Rewriting working compilers merely to change languages would create two semantic implementations and increase platform drift.

No systems language is universally “fastest.” Workload shape, algorithms, memory layout, operating-system APIs, GPU submission, compiler settings and bridge overhead determine the result. Language selection therefore follows recorded profiles and reproducible benchmarks, not a language ranking.

## Decision

Rust is the default native implementation language for CPU-heavy, memory-sensitive Studio services. It matches the existing Tauri boundary, provides native performance without a garbage collector, and makes ownership and concurrency errors harder to ship. Native services use typed, bounded IPC contracts and worker threads so large operations do not block the interface.

The first accelerator is `rust-scc-layered-v1`, a deterministic NJC Blueprint graph-layout engine. It:

- accepts at most 10,000 nodes and 50,000 wires per request;
- validates unique bounded IDs, dimensions and every edge endpoint;
- uses iterative strongly connected component analysis, avoiding recursion and safely grouping cycles;
- produces stable dependency layers independent of input ordering;
- runs through Tauri's blocking worker pool and reports execution time;
- has native tests for ordering, cycles, malformed IDs and a 5,000-node graph.

The browser uses `typescript-scc-layered-v1`, a contract-compatible reference fallback. The interface labels which engine ran. The fallback preserves browser development and testability; it is not represented as native execution.

## Language and engine boundaries

| Responsibility | Default | Reason |
| --- | --- | --- |
| Workbench, Monaco, accessible controls | React + strict TypeScript | Best fit for the current editor ecosystem and shared model |
| Canonical language/Feature compiler | Existing strict TypeScript packages | One portable semantic implementation already consumed by web and app tooling |
| Files, trust, supervised processes, graph analysis, future indexing/cache | Rust | Privileged boundary, bounded concurrency and native CPU/memory behavior |
| Vector/2D rendering | Current renderer, then measured Skia adapter | Mature text/path stack; promote only after target measurements |
| General GPU compute/rendering | WGSL through a measured wgpu/WebGPU prototype | Portable GPU path when CPU profiles justify it |
| Apple/Android OS integration | Thin Swift/Kotlin adapters | Platform APIs, signing and lifecycle integration—not alternate business logic |
| Existing ABI consumers | Versioned C ABI | Stable foreign-function boundary across Swift/Kotlin/C++ hosts |
| C or C++ implementation | Exception after profiling | Use for a proven vendor SDK, mature library, intrinsics, or existing C++ subsystem where FFI cost is justified |

C++ is not added as a competing Studio core. If a benchmark proves a Rust implementation cannot meet an agreed budget, the replacement must include an isolated versioned C ABI, fuzzable validation, sanitizers in CI, ownership documentation and parity tests. SIMD, GPU code or a specialized library can outperform ordinary Rust for a specific operation; that evidence should promote only that operation, not trigger a rewrite.

## Performance gates

- Every accelerator has explicit input limits and cancellation/back-pressure before accepting untrusted project data.
- Results must be deterministic when stored in source or used for package generation.
- UI-triggered native CPU work runs off the webview thread.
- Benchmarks record graph/project size, wall time, peak memory and bridge cost.
- A native path is retained only when its end-to-end improvement is material after serialization overhead.
- Release builds retain LTO, one code-generation unit, stripping and abort-on-panic; correctness, fuzzing and security checks take priority over micro-optimizations.

## Consequences

NJC Studio gains a native engine layer without forking its canonical compiler. The boundary supports future dependency indexing, package verification, asset processing, incremental graph compilation and render preparation, but each addition requires a measured bottleneck and its own safe contract. The Unreal comparison applies to the authoring workflow—typed graphs, synchronized source, inspectors and scalable native services—not to copying Unreal Engine or claiming equivalent scope.
