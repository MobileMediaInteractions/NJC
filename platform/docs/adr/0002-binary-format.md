# ADR 0002: FlatBuffers payload inside a verified container

Status: accepted — 2026-07-14

## Options

- JSON: excellent diagnostics, but larger, slower to validate/access, and not the requested production runtime representation.
- CBOR: compact and mature, but lacks the same generated schema/direct-access workflow.
- Protocol Buffers: strong schema evolution and bindings, but normally materializes message objects.
- FlatBuffers: schema-generated multi-language bindings, direct access, and documented compatibility rules.
- Custom binary: maximum control but unjustified security and maintenance risk before benchmarks.

## Decision

Use a FlatBuffers payload with an explicit `.fbs` schema. Wrap it in a small deterministic container that provides magic bytes, container version, payload length, SHA-256 checksum, and reserved flags. The wrapper is not a serializer; it is a framing and integrity boundary. The milestone implementation uses schema-aligned low-level TypeScript builder/accessor code because `flatc` is not installed in the current environment; it does not falsely claim generated bindings. Before schema v2 or native SDK decoding, CI must install pinned `flatc`, generate checked-in bindings, freshness-test them, and run `--conform`.

FlatBuffers documentation requires TypeScript bindings to be generated with `flatc --ts` and describes forward/backward evolution by appending fields or using explicit IDs: <https://flatbuffers.dev/languages/typescript/> and <https://flatbuffers.dev/evolution/>.
