# Studio configuration registry

Studio Configuration is the versioned control plane for runtime platform
behavior. The typed registry inventories reader experiences, Studio modules,
publishing, identity, storage, entitlements, CDN, developer API, mobile, TV,
Roku, NJC+, and Studio NJ Dev surfaces.

Every registry entry declares a stable key, owner, category, platforms,
classification, availability, default, dependencies, permission, rollout and
operational readiness. Mandatory controls such as authentication,
authorization, auditing, encryption, and backups are visible but cannot be
disabled as ordinary feature flags.

## Safe changes

1. Studio loads a configuration revision and displays connection health.
2. An administrator makes guided changes with selectors, toggles, and defaults.
3. Review shows affected features and platforms before the write.
4. A reason is always required. High-impact changes require the displayed
   confirmation phrase.
5. The server applies the update atomically only if the submitted revision is
   still current. Stale editors receive a conflict instead of overwriting a
   newer change.
6. The immutable history stores actor, time, previous and next values, reason,
   environment, and impact. An authorized rollback creates a new revision; it
   never erases history.

Public configuration responses contain only schema-validated feature data and
safe operational state. Credentials remain in secret storage. Clients may use
the configuration version and platform overrides while retaining last-known-
good behavior when a newer document is temporarily unavailable.
