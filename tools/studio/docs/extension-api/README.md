# Extension API direction

The extension manifest will include ID, publisher, version, Studio compatibility, commands, menus, panels, detectors, task adapters, importers, exporters, language/debug services, required capabilities, entitlement, checksum and signature.

The first release does not load third-party extensions. The intended default is capability-scoped WebAssembly component logic with serialized typed host calls. Native extensions are reserved for capabilities a WASM component cannot satisfy and require a separate signature, distribution and review policy. Extensions will not receive a Tauri shell/filesystem plugin or raw frontend native bridge.

Before enabling installation, implement signature trust roots, revocation, package size/decompression bounds, extension data directories, network allow lists, per-workspace approvals, CPU/memory limits, event quotas and an auditable permission UI.
