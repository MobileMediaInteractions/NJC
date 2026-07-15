# Feature module authoring

Implement the lifecycle methods you need: `discover`, `verify`, `resolve`, `entitle`, `register`, `initialize`, `start`, `suspend`, `resume`, `stop`, `dispose`. The host executes dependencies first and refuses cycles, conflicts, incompatible versions, missing entitlements, checksums, kill switches, or capabilities before registration.

Modules receive only declared capabilities through the broker. They do not receive the host container, secrets, filesystem, network, or navigation by default. Use the typed event bus for bounded host communication and unregister resources in `dispose`.

Three executable examples validate utility diagnostics, status-card UI, and animation integration in `src/core/representative-modules.ts`.
