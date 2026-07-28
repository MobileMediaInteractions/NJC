# Bun and Protocol Buffers benchmark results

Recorded on July 28, 2026 on an Apple M1 Mac mini with 8 GB RAM and macOS
27.0.0. The pinned runtimes were Node.js 22.23.1 and Bun 1.3.14. Values below
are the unrounded aggregate output from the committed harness unless a command
reports wall-clock time directly.

These are local direction signals. They are not Vercel production latency,
cost, cold-start, or capacity claims.

## Package installation

Both clean runs started without `node_modules` and used already-warm global
package caches. Bun required a temporary `workspaces` array in the root
`package.json`; without it, Bun read only the root package and installed six
packages instead of the monorepo.

| Manager | Filesystem state | Real | User | System |
| --- | --- | ---: | ---: | ---: |
| pnpm 11.9.0 | No `node_modules` | 20.90 s | 12.53 s | 32.37 s |
| Bun 1.3.14 | No `node_modules` | 7.60 s | 1.15 s | 4.11 s |
| pnpm 11.9.0 | No changes | 0.38 s | 0.29 s | 0.05 s |
| Bun 1.3.14 | No changes | 0.54 s | 0.06 s | 0.21 s |

## Next.js production build

Both builds used the same checkout, installed dependencies, `.env.local`,
Next.js 16.2.10, Turbopack, and existing build cache. Each completed all 84
routes. Database warnings came from the intentionally invalid local
`DATABASE_URL` placeholder and occurred under both runtimes.

| Runtime | Real | User | System | Compile | TypeScript |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node.js 22.23.1 | 22.96 s | 65.80 s | 7.33 s | 9.0 s | 10.5 s |
| Bun 1.3.14 | 27.77 s | 74.45 s | 11.01 s | 9.4 s | 15.1 s |

## HTTP and WebSocket loopback

Both runtimes executed the same `node:http` and `ws` source. Each aggregate is
15 measured samples after three warmups. HTTP used 400 requests per sample at
20 concurrent requests. WebSocket used 20 clients sending 100 sequential echo
messages each per sample.

| Runtime | Startup ms | HTTP ops/s mean | HTTP p50 latency mean | HTTP p95 latency mean | WS ops/s mean | WS p50 latency mean | WS p95 latency mean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Node.js 22.23.1 | 6.818333 | 10253.134777 | 1.720353 ms | 3.744786 ms | 69642.833626 | 0.270442 ms | 0.394422 ms |
| Bun 1.3.14 | 4.841584 | 53121.184837 | 0.346831 ms | 0.711703 ms | 99500.970277 | 0.179003 ms | 0.282108 ms |

Node HTTP sample throughput: mean `10253.134777`, p50 `10969.397766`, p95
`15089.357288`, p99 `15089.357288`. Bun HTTP sample throughput: mean
`53121.184837`, p50 `54925.250167`, p95 `68613.576912`, p99
`68613.576912`.

Node WebSocket sample throughput: mean `69642.833626`, p50 `71899.448621`,
p95 `75122.308509`, p99 `75122.308509`. Bun WebSocket sample throughput:
mean `99500.970277`, p50 `101227.807258`, p95 `107101.257867`, p99
`107101.257867`.

## Codec sizes

Gzip uses level 6. The table reports the Node zlib output because Bun and Node
ship different zlib implementations and produced slightly different gzip byte
counts. Uncompressed JSON and Protocol Buffer bytes were identical across
runtimes.

| Case | Records | JSON | JSON gzip | Protobuf | Protobuf gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| Small presence | 1 | 250 B | 200 B | 102 B | 117 B |
| Medium story list | 25 | 14,558 B | 856 B | 11,196 B | 880 B |
| Large content batch | 250 | 455,945 B | 6,951 B | 423,178 B | 7,810 B |

## Codec application round trips

The Protocol Buffer application measurement includes conversion from the
plain application object into a message, binary encoding, binary decoding,
and conversion back into a plain object. JSON measures stringify plus parse.
Each cell is milliseconds per operation from 25 measured samples after eight
warmup samples.

| Runtime | Case | JSON mean | JSON p95 | Protobuf application mean | Protobuf application p95 |
| --- | --- | ---: | ---: | ---: | ---: |
| Node.js 22.23.1 | Small presence | 0.001343 | 0.001521 | 0.001193 | 0.001377 |
| Node.js 22.23.1 | Medium story list | 0.042068 | 0.045033 | 0.055921 | 0.061650 |
| Node.js 22.23.1 | Large content batch | 0.848995 | 0.899536 | 1.039687 | 1.093151 |
| Bun 1.3.14 | Small presence | 0.000878 | 0.000960 | 0.001461 | 0.002060 |
| Bun 1.3.14 | Medium story list | 0.026405 | 0.028314 | 0.045491 | 0.049994 |
| Bun 1.3.14 | Large content batch | 0.320892 | 0.380750 | 0.739215 | 0.812146 |

## Compatibility outcome

- The Bun-driven Next.js production build completed.
- Repository type-check and lint command graphs resolved under Bun, although
  Turborepo replayed cached task output and those runs are not runtime proof.
- The uncached Bun test run failed. The web test command did not expand
  `tests/**/*.test.ts`, and the employee test run could not resolve
  `./cjs/index.cjs`. Turbo then cancelled the remaining affected tasks.
- The ordinary pnpm/Node test, lint, type-check, and production build path
  remains the accepted verification path.

## Reproduction

```bash
pnpm install
pnpm --dir investigations/bun-protobuf benchmark:codec:node
pnpm --dir investigations/bun-protobuf benchmark:codec:bun
pnpm --dir investigations/bun-protobuf benchmark:realtime:node
pnpm --dir investigations/bun-protobuf benchmark:realtime:bun
```
