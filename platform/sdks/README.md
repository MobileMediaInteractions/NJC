# Platform SDK boundary

The TypeScript SDK is the executable reference implementation. The C ABI is an ABI-stable ownership and playback-control boundary with a compiled smoke test. It validates container framing and limits before accepting a package; full FlatBuffers decoding, cryptographic checksum verification, rendering, and licensing remain implemented in the TypeScript runtime in this milestone. It must not yet be presented as a production native renderer.

The Swift source wraps the C ABI with throwing ownership semantics. The Kotlin source defines the matching idiomatic API, but its JNI bridge is intentionally not claimed as built until an Android toolchain is available. React Native uses the current TypeScript runtime only on server/web today; a native JSI binding belongs after the C++ runtime reaches feature parity.
