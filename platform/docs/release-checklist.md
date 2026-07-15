# Release checklist

- [ ] Migrations applied in preview and rollback/export tested.
- [ ] Ed25519 key in secret manager; public/retired key set verified; no private key in logs/build.
- [ ] Durable rate limiting configured and denial tested.
- [ ] Exact application identities/attestation policy reviewed.
- [ ] Unit, integration, corruption, determinism, benchmark and app builds green.
- [ ] C ABI/version and generated schema freshness green.
- [ ] Playground/current-host smoke screenshots reviewed.
- [ ] Privacy retention, support window, deprecations and limitations published.
- [ ] iOS/Android signing, associated domains, push and store/internal distribution configured separately.
- [ ] Production development fixtures/showcase disabled.
