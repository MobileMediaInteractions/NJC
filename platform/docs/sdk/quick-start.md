# SDK quick starts

## TypeScript

```ts
import { AnimationRuntime } from "@platform/runtime/animation";
const runtime = new AnimationRuntime(packageBytes, { scene: "Welcome" });
runtime.onEvent(console.log);
runtime.play("entrance");
renderer.render(runtime.tick(performance.now()));
```

## C/C++

Include `sdks/c-abi/include/platform_runtime.h`, initialize a size/versioned config, create an opaque runtime, load verified PANI bytes, select a scene, play, forward lifecycle and destroy. Build the sample with CMake or the CI clang command.

## Swift and Kotlin

Swift wraps the C ABI with throwing lifetime management. Kotlin declares the equivalent JNI ownership API; the JNI implementation/native renderer is not complete because Java/Android tooling is absent locally. Neither wrapper should be advertised as a production renderer yet; see `sdks/README.md`.
