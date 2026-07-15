# Animation language tutorial

Create `welcome.pani`:

```text
language 1
package tutorial;
scene Welcome {
  input name: string = "Guest";
  component title text { text: "Hello, ${name}"; opacity: 0; }
  timeline reveal 300ms {
    track title.opacity { 0ms: 0; 300ms: 1 ease outCubic; }
  }
}
```

Compile with `compileAnimation(source)`. Ship only `packageBytes`, not source. At runtime construct `AnimationRuntime(bytes, { scene: "Welcome" })`, set `name`, call `play("reveal")`, and pass each `tick()` frame to a renderer/host adapter. Always validate entitlement before constructing licensed feature modules. See `examples/animation-showcase/welcome.pani` for state machines, host views, vector content, binding, springs and reduced motion.
