# Playground guide

Run `pnpm --dir apps/platform-playground dev` and open port 3010. Edit source, compile, inspect diagnostics/hash/size/features, select a timeline, play/pause/reverse, seek/scrub, change speed and inputs, toggle reduced motion, and preview phone/tablet/desktop sizes.

Compilation and frame evaluation use server endpoints so every preview passes the real package verifier. Current gaps are file-system open/export, direct package upload, orientation/pixel ratio/safe-area controls, event/state-machine controls, FPS/CPU/memory panels, hierarchy inspection and automated browser smoke coverage.
