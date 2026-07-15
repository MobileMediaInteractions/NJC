# License client integration

1. Generate and securely persist a random pseudonymous installation value.
2. Send a one-time license key, exact build identity, device value, and idempotency key to activation.
3. Store the signed receipt in platform secure storage; never store the raw key after activation.
4. Verify signature, issuer, audience, product, exact app identity, clock window, license version/revocation data, and required features before loading a module.
5. Refresh online before expiry. Request offline only when product policy permits it.
6. Respect grace as degraded continuity, not permanent authorization. A monotonic clock should prevent local wall-clock rollback from extending a lease.
7. Replace the stored receipt atomically and redact it from logs/analytics.

The executable TypeScript verifier is in `src/licensing/verifier.ts`. Native clients need equivalent Ed25519 and secure-clock implementations before production release.
