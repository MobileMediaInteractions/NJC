# Compiler architecture

The lexer enforces source/token limits and precise spans. The parser produces typed source nodes. Semantic analysis checks duplicates, references, types, track targets, state transitions, reduced-motion references and host properties. Formatting produces canonical source. Compilation derives a reproducible SHA-256, required features, and FlatBuffers payload, then wraps it in the verified PANI container.

Current optimization is structural: canonical ordering and compact typed tables. A separate optimizer pass for track reduction, geometry deduplication and asset compression is not yet implemented; benchmark evidence must precede lossy transformations.
