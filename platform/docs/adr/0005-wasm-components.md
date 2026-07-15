# ADR 0005: WebAssembly is optional and capability constrained

Status: accepted — 2026-07-14

WebAssembly may later host portable deterministic business-logic modules. It is not the UI renderer and it is not the native high-performance adapter. A WASM module receives only explicit imported functions derived from granted capabilities; no WASI filesystem, sockets, environment, clock, randomness or secrets are ambient. Memory, instruction/fuel, call-depth and output limits are mandatory.

The WebAssembly security model describes execution in a sandboxed environment while noting that embedding APIs define interaction with the host: <https://webassembly.org/docs/security/>. Because no current module requires WASM, the milestone records the host interface and defers a runtime dependency rather than introducing an unused sandbox.
