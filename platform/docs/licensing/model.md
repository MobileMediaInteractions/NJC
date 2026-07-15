# Licensing model

Organizations own applications and licenses. Products contain versioned feature modules; plans bind feature IDs and usage/device/seat limits. An application has exact platform/environment/build/package/signing/host identities. Commercial, trial, and development licenses receive a one-time raw key whose HMAC is stored. First-party licenses have no key and must be issued through an identity/attestation service.

Activation creates a pseudonymous installation and a signed, bounded receipt. Online and offline leases use the same receipt shape; offline leases have a longer explicit expiry and grace end. Every refresh and deactivation requires the current receipt and re-checks its signature, installation, app identity, license version/status, and product.

Ed25519 private keys stay in deployment secrets. Public and retired keys are published. Key rotation is a deployment/secret-manager operation; the HTTP service never returns a private key. Revocation increments the license version so old otherwise-valid receipts stop immediately when checked online.
