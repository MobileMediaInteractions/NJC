# Studio threat model

## Trust boundaries

The main webview is trusted application code but is not granted filesystem or shell plugins. Rust commands validate every path and own process creation. Opened repositories, animation/feature packages, language servers, extensions, build scripts, deep links and network licensing responses are untrusted until validated for their operation.

## Controls

- Folder inspection reads metadata and bounded text only; it never executes detection-time code.
- Canonical paths must remain beneath the canonical workspace root. Symlink escapes and `..` traversal are rejected.
- Explorer scans have depth, entry and file-size limits and exclude dependency, VCS, generated and secret directories.
- Writes require explicit workspace trust, an expected content hash, bounded UTF-8 text and atomic replacement.
- Tasks are allow-listed adapter definitions with separate program/argument arrays. No frontend-provided shell command is accepted.
- The UI shows executable, arguments, working directory and environment impact before trust or execution.
- Tool output is bounded and redacted for common credential formats before reaching the webview.
- Animation compilation inherits source/token/depth and package-size bounds from `@platform/runtime`.
- Package extraction is not implemented until canonical output paths, file-count, total-size and compression-ratio bounds exist.
- Licensing private keys never enter the Studio frontend. Administrative controls require authenticated, capability-checked server APIs.
- Tokens belong in OS secure storage; no production token is persisted in localStorage or recovery snapshots.
- Update checks are disabled until signed update verification and rollback are configured.
- Workspace extensions receive no native capability. The proposed extension host uses signed manifests and capability-scoped WASM components where practical.

## Residual risks and required hardening

- Language servers and compilers execute third-party native code. They require sandbox/process profiles and explicit trust before general-purpose discovery is enabled.
- A trusted project task can still be malicious. Trust UI must remain explicit and revocable, and future terminals require per-command review or a clearly trusted interactive session.
- System webview vulnerabilities are inherited from the host OS. Supported OS minimums and security-update policy must be part of release support.
- Cross-platform PTY, DAP, updater, extension installation, archive extraction and production licensing authentication are not enabled in the first vertical slice; their threat cases must be closed before release.
