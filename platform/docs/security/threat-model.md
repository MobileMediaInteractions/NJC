# Security and privacy threat model

## Protected assets

Private signing keys, license/activation state, application identity, feature packages, customer/organization data, audit history, host capabilities, application storage and network credentials.

## Principal threats and controls

| Threat | Control |
| --- | --- |
| Reusable first-party bypass | Signed receipt bound to exact app/platform/environment/build identities; no bypass branch |
| Forged/tampered receipt | Canonical payload, Ed25519 signature, key ID, issuer/audience/app/environment/product/time checks |
| Stolen private key | Provider/KMS boundary, no private keys in clients, rotation and retained public verification keys |
| Seat/activation replay | Server-side activation record, idempotency key, installation pseudonym, lease ID and revocation checks |
| Clock rollback | Cached server time plus monotonic elapsed time when available; bounded grace; online revalidation for revocation |
| Malicious feature package | Size limits, checksum/signature, schema/version validation, dependency/capability/entitlement checks before lifecycle |
| Capability escalation | Manifest requests are intersected with host policy; sensitive capabilities require explicit host authorization |
| Circular/conflicting modules | Deterministic dependency graph validation before registration |
| Parser/package denial of service | Token, nesting, string, scene, track, keyframe, payload and decompression limits; fuzz targets |
| Arbitrary code through config | Typed configuration only; no remote JavaScript/native code evaluation |
| Native-view property abuse | Adapter allow list; unsupported properties are diagnostics |
| License API abuse | Admin auth/RBAC, rate limits, idempotency, immutable audit records, sanitized logs |

## Installation identity and privacy

The reference client uses a random installation ID stored in secure storage, plus declared application identifiers, platform, environment, build ID and optional platform attestation. It does not collect serial numbers, IMEI, MAC addresses, contacts, advertising IDs or a cross-application hardware fingerprint. Transferring/reinstalling may consume a new activation; the server provides a deactivation/transfer workflow.

## Offline limitations

Signed offline leases make modification detectable but cannot prevent a determined attacker from patching a client, freezing its environment, or replacing clock/secure-storage behavior. High-value hosted services therefore continue to authorize entitlements server-side. Offline states are explicit: malformed, signature invalid, wrong issuer/audience/app/environment/product, not-yet-valid, expired, revoked (when known), unsupported version, seat limit and server unavailable.
