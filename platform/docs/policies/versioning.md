# Versioning policy

Runtime API, feature manifest, entitlement receipt, DSL, container and FlatBuffers schema versions evolve independently. Semantic versions cover SDK APIs; integer versions cover on-disk/wire formats. A producer declares minimum runtime and required features. Readers reject unknown required versions before access.

Minor releases may add optional API/schema fields and features guarded by capability checks. Breaking language or binary meaning requires a new explicit version and migration/conformance fixtures. Deterministic hashes cannot change silently for unchanged compiler/version/input.
