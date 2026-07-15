# Feature manifest specification

The canonical JSON Schema is `schemas/feature-manifest.schema.json`; runtime validation is `featureManifestSchema`.

Required fields include stable ID/version, minimum runtime, supported platforms, dependencies with ranges/optionality, conflicts, required/optional capabilities, entitlement ID, entry point, package checksum, signature metadata, lifecycle policy, kill-switch key, privacy declarations, resource budgets, configuration schema, and migration descriptors.

Manifests request authority; they never grant it. Package checksums and signatures authenticate bytes, while entitlement receipts authorize use. Both are required boundaries.
