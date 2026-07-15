# Packaging and release

## Local

```bash
pnpm studio:check
pnpm studio:build
pnpm --dir tools/studio tauri build
```

The first two commands verify source, UI tests, Rust tests and a native executable. The final command creates target-native bundles when the host has the corresponding Tauri prerequisites.

## Signing

- macOS: use a Developer ID or App Store certificate, hardened runtime, entitlements and notarization. Apple application builds still require full Xcode.
- Windows: sign the executable and MSI/NSIS installer with the approved organization certificate and timestamp service.
- Linux: publish distro-appropriate checksums/signatures. AppImage embedded signatures require an explicit verification story.

## Updates

Production auto-update is disabled. Before enabling it, provision offline-protected signing keys, sign update metadata and artifacts, pin the public verification key, separate stable/beta/internal channels, test rollback, and make a failed verification non-installing.

## CI

`studio-packages.yml` builds unsigned review artifacts on macOS, Windows and Ubuntu through workflow dispatch or Studio release tags. Signing secrets and release publication must be added only after the release policy is approved.
