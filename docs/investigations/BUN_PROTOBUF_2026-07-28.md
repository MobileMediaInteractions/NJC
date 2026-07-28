# Bun and Protocol Buffers decision

**Decision date:** July 28, 2026  
**Status:** Investigation complete; no production migration approved

## Decision

Keep **pnpm, Node.js 22, and JSON** as the supported production toolchain and
public transport.

- **Bun package manager — defer.** A clean-filesystem, warm-cache install was
  2.75× faster locally, but an unchanged install was slower than pnpm. Bun also
  required duplicating the workspace list into the root `package.json` and
  would introduce a second lockfile and supply-chain path. This is a CI
  optimization candidate, not an application-speed improvement.
- **Bun local script/test runtime — reject for now.** The uncached workspace
  test matrix failed under Bun because of glob and module-resolution
  differences.
- **Bun build runtime — reject for now.** The Bun Next.js build completed but
  took 27.77 seconds versus 22.96 seconds for Node in the measured pair.
- **Bun Vercel Functions runtime — defer.** Vercel currently offers it in Beta
  on all plans, but this repository has no production Bun canary, the
  application is primarily database/network bound, and its current “real
  time” chat uses cursor polling rather than WebSockets. A local loopback
  speedup does not prove a lower production p95, error rate, or cost.
- **Protocol Buffers for existing endpoints — reject.** Compressed medium and
  large representative news payloads were 2.8% and 12.4% larger than gzip
  JSON. Full application-object Protocol Buffer round trips were slower than
  JSON for those payloads under both runtimes.
- **Protocol Buffers for a future internal event stream — defer.** Reconsider
  only if a persistent chat/event service or large analytics batch becomes a
  measured bottleneck and every target client, especially Roku and television
  hardware, passes a dual-format canary.

The reported Question House result is therefore not reproducible here. In the
equivalent local `node:http` + `ws` harness, Bun HTTP throughput was about
5.18× Node and WebSocket throughput was about 1.43× Node—not 21×. The
repository does not currently operate a WebSocket backend, so neither number
describes today’s NJ Courier production traffic.

## Repository architecture reviewed

The audit covered:

- the Next.js 16 web, Studio, API, cron, webhook, Blob, Neon/Drizzle, Clerk,
  Stripe, Upstash, backup, PDF, and Distribution paths;
- Expo/React Native reader, employee, Apple TV/Android TV applications;
- Roku BrightScript and Node-based package/device scripts;
- the Vite/Tauri/Rust Studio NJ Dev desktop application;
- Turborepo, pnpm workspace, TypeScript, ESLint, Vitest, tsx, Drizzle
  migrations, build scripts, and CI-equivalent root commands;
- the platform licensing/runtime packages and visual-feature compiler,
  language, model, playground, and runtime packages.

The workspace relies on Node-specific crypto, filesystem, streams, zlib,
child-process, PDF, tar, migration, and build behavior. Bun documents broad
Node compatibility, but also documents incomplete or behaviorally different
areas such as buffered outgoing `node:http` request bodies, `https.Agent`
differences, partial `child_process`, and incomplete `fs` test coverage.
Repository tests exposed real compatibility failures even though the web
production build completed.

## Current real-time baseline

There is no NJ Courier WebSocket server to accelerate:

- employee chat polls messages every 3 seconds;
- Studio chat polls messages every 3 seconds and workspace state every 15
  seconds;
- presence uses HTTP heartbeats;
- device pairing uses bounded HTTP polling;
- the employee bootstrap contract explicitly declares `cursor-polling`.

A future transport redesign must be evaluated independently from a runtime
change. Moving polling to a durable event service may create a larger gain
than changing the JavaScript runtime, but it would also require Vercel,
authorization, reconnect, ordering, deduplication, mobile backgrounding, and
Roku/TV design work.

## Measurements

The committed [raw aggregate results and reproduction commands](../../investigations/bun-protobuf/RESULTS.md)
cover:

- Node 22.23.1 and Bun 1.3.14 on Apple M1 / 8 GB;
- clean-filesystem and unchanged package installs;
- Node and Bun Next.js production builds;
- 15-sample HTTP and WebSocket loopback comparisons;
- 25-sample JSON and Protocol Buffer codec comparisons;
- uncompressed and gzip-compressed small, medium, and large payloads.

Important interpretation:

- Bun’s 5.18× loopback HTTP result is isolated runtime overhead with no TLS,
  Vercel edge, authentication, database, Blob, or public network.
- Bun’s WebSocket result is 1.43× in the final recorded pair.
- Bun’s build was about 21% slower in the final recorded pair.
- The small presence payload saved 83 compressed bytes with Protocol Buffers.
  That absolute saving does not justify schema/runtime code across web,
  mobile, TV, Roku, Studio, APIs, and observability.
- Repetitive news text compresses exceptionally well as JSON. The representative
  medium and large Protocol Buffer payloads lost to gzip JSON.
- Protocol Buffers are serialization, not encryption. They do not replace
  TLS, Clerk sessions, API keys, capabilities, validation, rate limits, audit
  logs, or payload-size limits.

## JSON classification and disposition

| Data path | Classification | Decision |
| --- | --- | --- |
| Public and developer APIs | External compatibility contract | Keep JSON; do not silently change consumers |
| Studio forms and reader web fetches | Small browser HTTP payloads | Keep JSON |
| Clerk, Stripe, Expo, Vercel Blob, newsletter hooks | Third-party contract | Keep required format |
| Lottie and dotLottie metadata | Standard animation interchange | Keep JSON |
| JSON-LD, web manifests, package/TypeScript/Vercel config | Web/tooling standard | Keep JSON |
| Portable backup manifest and human-readable exports | Archive/interchange | Keep JSON/CSV/SQL |
| Feature and animation compiled package | Internal binary runtime | Keep the existing FlatBuffers design |
| Roku reader APIs | Cross-platform contract with native JSON support | Keep JSON |
| Employee chat polling | Small high-frequency internal HTTP | Keep JSON until transport is redesigned |
| Analytics page views | Small individual ingestion events | Keep JSON; batch first if volume warrants |
| Future durable chat/event stream | Potential internal binary candidate | Benchmark later with dual-format canary |

Adding Protocol Buffers to the existing animation package would create a
second binary schema system beside its current FlatBuffers format without a
measured benefit.

## Compatibility and migration cost

### Bun package manager

Bun’s documented monorepo source of truth is the `workspaces` field in
`package.json`; this repository’s source is `pnpm-workspace.yaml`. The valid
test therefore required a temporary duplicate workspace list. Adoption would
also require:

- a committed `bun.lock` and a policy for eliminating or synchronizing
  `pnpm-lock.yaml`;
- lifecycle-script and native/prebuilt-binary review;
- CI cache and supply-chain policy changes;
- validation of Expo, React Native TV, BrightScript, Vite, Tauri/Rust,
  Drizzle, backup/restore, and every release script;
- a one-step rollback to the pnpm lock and install command.

### Bun runtime

Vercel’s current Bun runtime is Beta and uses `"bunVersion": "1.x"` in
`vercel.json`. For Next.js with ISR, Vercel also requires Bun-driven build and
development commands. No such production configuration was committed because
the repository test matrix failed and the build regressed locally.

### Protocol Buffers

A production binary contract would require owned `.proto` packages, generated
clients for every relevant language, field-number reservation, unknown-field
rules, golden fixtures, mixed-version tests, content negotiation, corruption
handling, observable error decoding, and rollback. Roku would need a reviewed
BrightScript codec or a deliberately retained JSON endpoint. None of that
complexity is justified by the current measurements.

## Reconsideration gates

Do not reopen a migration based on a generic benchmark. Reconsider only with a
named owner and production-representative canary.

### Bun package manager

- At least 30% lower median clean CI install wall time across ten comparable
  runs.
- No increase in complete CI wall time, supply-chain risk, or cache failures.
- One lockfile source of truth and a tested one-command pnpm rollback.

### Bun build or Functions runtime

- The complete uncached test, lint, type-check, build, migration, backup,
  mobile, TV, Roku, Studio, and release matrix passes.
- At least 20% lower production p95 latency or 15% lower measured CPU/cost for
  the selected route group across a statistically meaningful canary.
- No increase in p99, memory, error rate, cold-start failures, or lost Vercel
  observability.
- Bun has an acceptable support status for the selected production risk.

### Protocol Buffers candidate

- At least 25% lower compressed transfer bytes and 10% lower end-to-end p95
  latency on a measured bottleneck, not merely faster codec microseconds.
- Generated-client and runtime bundle cost is included.
- Web, iOS, Android, Apple TV, Android TV, and real Roku hardware are measured
  where they consume the contract.
- JSON compatibility remains available during a dual-format canary and
  rollback.

## Rollback

No production runtime or endpoint changed, so current rollback is simply
removing the isolated investigation workspace. A future Bun canary must revert
`bunVersion`, build scripts, package-manager metadata, and route selection in
one commit. A future Protocol Buffer canary must preserve the current JSON
route/version until all binary consumers are proven and rollback telemetry is
clean.

## Primary references

- [Vercel: Bun runtime for Functions](https://vercel.com/docs/functions/runtimes/bun)
- [Vercel: Bun runtime Public Beta announcement](https://vercel.com/changelog/bun-runtime-now-in-public-beta-for-vercel-functions)
- [Bun: Node.js compatibility](https://bun.sh/docs/runtime/nodejs-compat)
- [Bun: workspaces](https://bun.sh/docs/pm/workspaces)
- [Bun: lockfiles and pnpm lock migration](https://bun.sh/docs/pm/lockfile)
- [Next.js: installation and supported package managers](https://nextjs.org/docs/app/getting-started/installation)
- [Protocol Buffers: proto3 language and compatibility](https://protobuf.dev/programming-guides/proto3/)
- [Protocol Buffers: ProtoJSON format](https://protobuf.dev/programming-guides/json/)
