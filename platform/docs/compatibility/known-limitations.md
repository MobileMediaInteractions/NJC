# Known limitations

This repository demonstrates a complete TypeScript/web/headless first milestone, not the final cross-platform product.

- Persistent first-party issuance awaits a selected app-attestation provider; no insecure public bypass exists.
- Licensing mutations have database constraints but no webhook delivery worker, billing, customer portal, seat-transfer API or signed native usage uploader yet.
- Native C++ validates framing/control state but does not yet decode FlatBuffers, verify SHA-256, evaluate scenes or render. Swift/Kotlin therefore are integration boundaries, not production renderers.
- Mobile, employee, TV and Roku production animation integration is not complete. The current web app and standalone playground are the verified hosts.
- Package v1 lacks embedded assets/chunks/compression/signature/partial loading. TypeScript FlatBuffers accessors are hand-aligned until pinned `flatc` generation lands.
- Language/runtime v1 lacks many planned types, constraints, accessibility/localization declarations, gestures, advanced easing/composition and native render-thread work.
- Lottie/dotLottie conversion is compatibility reporting, not a complete converter.
- Playground gaps are listed in its guide.
- Java, Android SDK and `flatc` are absent locally, so those builds are not claimed.
