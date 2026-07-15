# ADR 0004: Ed25519 receipts and key-provider isolation

Status: accepted — 2026-07-14

## Decision

Sign canonical UTF-8 receipt payloads with Ed25519. Receipts include a key ID; verification uses a published key ring so rotation does not invalidate unexpired leases. Server code receives private signing operations through a `SigningKeyProvider`; clients receive only public keys. Production configuration must use an environment/KMS-backed provider. The checked-in development key fixture is accepted only when an explicit development mode is set and production mode is false.

Node's maintained crypto API supports Ed25519 key-pair generation and requires a `null` algorithm for Ed25519 `sign`/`verify`: <https://nodejs.org/api/crypto.html>.

## First-party policy

The current application gets an ordinary signed `first_party` entitlement whose claims enumerate application ID, platform, environment, build ID, permitted bundle/package/host identity, product and feature IDs. It passes through the same verifier. There is no skip flag, magic key or reusable client secret. Production mobile identity attestation still requires Apple App Attest/DeviceCheck and Play Integrity integration; identifier strings alone are not represented as tamper-proof.
