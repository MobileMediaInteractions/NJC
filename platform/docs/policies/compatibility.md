# Compatibility policy

The supported baseline is container v1, animation schema v1, DSL v1, receipt v1, manifest schema v1 and runtime 0.1.x. Current readers accept older compatible minimum-runtime values and reject newer required runtime/schema/container versions.

Before schema v2, add pinned `flatc`, generated multi-language bindings, `flatc --conform`, v1 golden packages, upgrade/rollback tests and an unknown-optional-field fixture. Current host support is tracked in `../compatibility/current-hosts.md`.
