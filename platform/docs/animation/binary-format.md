# Binary and package format v1

Bytes 0–7 are `PLATANI\0`; 8–9 are little-endian container version; 10–11 reserved flags; 12–15 payload length; 16–47 SHA-256 of the payload; byte 48 begins the FlatBuffers payload identified by `PANI`.

The FlatBuffers schema stores schema/minimum-runtime/compiler versions, canonical source hash, required features, multiple scenes, inputs, components, timelines, tracks, keyframes, machines and transitions. The verifier checks the 16 MB cap, header, version, exact length and checksum before FlatBuffers access. The decoder rejects unknown schema versions and runtime rejects missing required features/minimum versions.

Embedded assets, chunk indexes, compression, signatures, unknown optional chunks and partial scene loading are designed requirements but not present in container v1. Container/schema evolution must preserve v1 readers and add a conformance fixture before v2 ships.
