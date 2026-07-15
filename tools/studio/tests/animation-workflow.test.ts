import { describe, expect, test } from "vitest";
import { AnimationRuntime, compileAnimation, verifyAndUnwrapAnimationPackage } from "@platform/runtime/animation";
import demoSource from "../src/demo/onboarding.pani?raw";
import { updateComponentProperty, updateKeyframe } from "../src/lib/structured-edits";

describe("Studio animation workflow", () => {
  test("compiles, verifies, previews, and drives the real state machine", () => {
    const compiled = compileAnimation(demoSource);
    expect(verifyAndUnwrapAnimationPackage(compiled.packageBytes).byteLength).toBeGreaterThan(100);
    const runtime = new AnimationRuntime(compiled.packageBytes, { scene: "Onboarding", rendererName: "studio-test" });
    expect(runtime.send("OnboardingFlow", "ready", 100)).toBe(true);
    const frame = runtime.tick(300);
    expect(frame.activeStateMachines.OnboardingFlow).toBe("ready");
    expect(frame.nodes.find((node) => node.id === "title")).toBeTruthy();
  });

  test("a property edit preserves comments and changes only structured source", () => {
    const edited = updateComponentProperty(demoSource, "title", "x", 44);
    expect(edited).toContain("// Built-in project: every visual value remains editable source.");
    expect(edited).toContain("component title text");
    expect(edited).toContain("x: 44dp;");
    expect(compileAnimation(edited).compiled.scenes[0]?.components.find((item) => item.id === "title")?.properties.x.value).toBe(44);
  });

  test("timeline keyframe edits remain compilable", () => {
    const edited = updateKeyframe(demoSource, "title.opacity", 1, "easing", "spring");
    const compiled = compileAnimation(edited);
    expect(compiled.compiled.scenes[0]?.timelines.find((item) => item.name === "entrance")?.tracks.find((item) => item.target === "title.opacity")?.keyframes[1]?.easing).toBe("spring");
  });
});
