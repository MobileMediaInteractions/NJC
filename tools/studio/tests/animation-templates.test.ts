import { compileAnimation } from "@platform/runtime/animation";
import { describe, expect, test } from "vitest";
import { animationTemplates, createAnimationSource } from "../src/lib/animation-templates";

describe("NJC Studio animation templates", () => {
  test.each(animationTemplates)("$label creates a valid package", ({ id }) => {
    const source = createAnimationSource("Middlesex Morning", id);
    const built = compileAnimation(source);
    expect(built.packageBytes.byteLength).toBeGreaterThan(100);
    expect(built.compiled.scenes[0]?.name).toBe("Middlesex_Morning");
  });
});
