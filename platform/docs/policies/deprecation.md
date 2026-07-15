# Deprecation policy

Public APIs and language constructs receive a documented replacement and at least one minor release of overlap before removal. Wire formats remain readable for the stated support window. Security-critical endpoints/keys may be disabled immediately, with audit and migration guidance.

Compiler warnings may announce deprecation but must not rewrite semantics silently. Removal requires conformance tests and release notes.
