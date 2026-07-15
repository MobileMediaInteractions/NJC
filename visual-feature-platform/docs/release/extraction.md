# Extraction and release guide

`visual-feature-platform/` contains its own `package.json`, `pnpm-workspace.yaml`, packages, app, schemas, examples, tests and documentation. It is not a nested Git repository.

To extract later:

1. Copy the directory into a new repository while preserving paths.
2. Run `pnpm install` and `pnpm check` inside the extracted root.
3. Replace private workspace flags and choose package publication names only after product naming and licensing review.
4. Preserve package dependency direction: model → language/compiler → runtime → applications.
5. Move the Studio UI either into an extracted desktop app or expose it through a versioned plugin contract. It currently remains in the parent repository to extend the existing Tauri shell.
6. Replace the current development host identity and mock connector with versioned external adapter packages.
7. Add provenance, package signing, changelogs and a compatibility matrix before public release.

Generated artifacts such as `dist/`, package bytes and screenshots are not source of truth. Feature IR and controlled source are source-controlled; packages are reproducibly generated in CI.
