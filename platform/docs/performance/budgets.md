# Performance budgets

These are regression tripwires for the current TypeScript/headless reference path, not claims about native GPU submission or battery use.

| Measure | Current CI budget | Measurement |
| --- | ---: | --- |
| Compile the showcase | 100 ms | One parse, semantic analysis, FlatBuffers encode, and SHA-256 container wrap |
| Package load p95 | 20 ms | 100 checksum verifications, FlatBuffers decodes, and scene initializations |
| Frame evaluation mean | 0.5 ms | 20,000 deterministic headless evaluations |
| Showcase package | 64 KB | Complete PANI container |

Run `pnpm platform:benchmark`. Results depend on the machine and Node release, so only stable, generous thresholds fail CI. First-frame render submission, GPU memory, CPU/battery, context-loss recovery, and large native scenes need physical-device harnesses and are explicitly outside this milestone.
