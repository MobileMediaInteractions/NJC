# Capability security model

The host owns the allowlist. It intersects requested capabilities with platform policy and entitlement before module registration. Required missing capabilities fail the module; optional capabilities are absent and must be feature-detected.

Current examples use logging, UI overlays, theme, animation, accessibility, and app lifecycle. Network, storage, camera, location, notifications, account, navigation, background work, and native services should be split by purpose and scope rather than represented as one broad “native” capability. Every privileged broker call should validate its arguments and be auditable.
