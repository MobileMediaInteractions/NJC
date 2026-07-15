# Runtime architecture

`AnimationRuntime` owns a scene, inputs, state-machine states, active timeline, direction, speed, pause offset, pending events, retarget bases and diagnostics. `tick(now)` is deterministic for a given package/input/event/time sequence. It supports seek, scrub, reverse, pause/resume, speed, event callbacks, reduced-motion substitution and smooth property retargeting.

The current easing set is linear, cubic in/out/in-out, steps and a fixed-step damped spring. Arbitrary cubic Bézier parameters, decay/inertia, repeats, stagger/parallel composition, render-thread scheduling, caches and GPU context recovery are future work. Host lifecycle can pause the clock; native lifecycle forwarding is exposed in the C ABI.
