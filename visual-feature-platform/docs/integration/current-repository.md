# Current-repository integration

The Composer is integrated into `tools/studio` as a new **Feature** editor. It reuses the existing Tauri workspace trust boundary and runs feature compilation/runtime work inside the local trusted webview without granting feature source native access.

The development host uses the current application's identity `new-jersey-courier`, explicitly registered capabilities and the feature's approved development entitlement. The purchase action is a typed host connector. Production purchase, authentication, secure storage and route registration must be supplied by explicit adapters; repository functions are never exposed merely because detection found them.

The standalone `apps/feature-playground` loads the same verified package and runtime. It demonstrates both purchase success/failure and a live-information fixture using the same connector/media contracts intended for real adapters.

Current host generation is intentionally limited. Native route, manifest, permission and dependency-registration generators remain a subsequent milestone because each target's current architecture must be inspected and tested before mutation.
