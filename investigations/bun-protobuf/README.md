# Bun and Protocol Buffers investigation

This workspace benchmarks Node.js versus Bun and JSON versus Protocol Buffers
for representative codec and real-time workloads. It exists to answer whether
a migration is worthwhile for NJ Courier—not to repeat an unrelated project's
reported 21× result as a Courier claim.

Read [RESULTS.md](RESULTS.md) before interpreting benchmark output. The report
records methodology, observed numbers, compatibility constraints and the
current recommendation.

```bash
pnpm --dir investigations/bun-protobuf test
pnpm --dir investigations/bun-protobuf benchmark:codec:node
pnpm --dir investigations/bun-protobuf benchmark:realtime:node
```

![A production consumer whose behavior must remain compatible](../../docs/screenshots/dark/status-dashboard.jpg)
