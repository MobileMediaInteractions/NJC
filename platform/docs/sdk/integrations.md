# Host integration guide

- Web: `apps/web/src/app/dev/platform` is a non-production host example. The standalone playground is `apps/platform-playground`.
- iOS/Android reader and employee apps: Expo/React Native can consume the portable package/runtime model, but native Ed25519, secure monotonic lease time and a renderer/JSI bridge are still required before shipping.
- Apple TV/Android TV: same React Native caveats plus focus, overscan and TV performance testing.
- Roku: only the package/receipt contract is selected. No SceneGraph renderer is claimed.
- CDN: compiled packages may be distributed as immutable hash-addressed assets after package signing/cache policy lands.

Every host must map only supported properties, forward reduced-motion/theme/lifecycle policy, verify entitlement before module start, and report runtime/package/renderer/capability diagnostics.
