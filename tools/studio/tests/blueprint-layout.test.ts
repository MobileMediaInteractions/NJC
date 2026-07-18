import { describe, expect, test } from "vitest";
import { layoutBlueprintGraphFallback } from "../src/lib/blueprint-layout";

describe("Blueprint graph layout fallback", () => {
  test("produces stable dependency layers independent of input order", () => {
    const result = layoutBlueprintGraphFallback(
      [{ id: "finish" }, { id: "start" }, { id: "work" }],
      [{ fromNodeId: "work", toNodeId: "finish" }, { fromNodeId: "start", toNodeId: "work" }],
    );
    expect(Object.fromEntries(result.positions.map((position) => [position.id, position.layer]))).toEqual({ finish: 2, start: 0, work: 1 });
    expect(result.engine).toBe("typescript-scc-layered-v1");
    expect(result.cyclic).toBe(false);
  });

  test("groups cycles and keeps their downstream node later", () => {
    const result = layoutBlueprintGraphFallback(
      [{ id: "a" }, { id: "b" }, { id: "after" }],
      [{ fromNodeId: "a", toNodeId: "b" }, { fromNodeId: "b", toNodeId: "a" }, { fromNodeId: "b", toNodeId: "after" }],
    );
    const positions = Object.fromEntries(result.positions.map((position) => [position.id, position]));
    expect(result.cyclic).toBe(true);
    expect(positions.a!.layer).toBe(positions.b!.layer);
    expect(positions.after!.layer).toBeGreaterThan(positions.b!.layer);
  });

  test("rejects unknown edge targets", () => {
    expect(() => layoutBlueprintGraphFallback([{ id: "known" }], [{ fromNodeId: "known", toNodeId: "missing" }])).toThrow("Unknown Blueprint destination node");
  });

  test("rejects IDs that would sort differently across native engines", () => {
    expect(() => layoutBlueprintGraphFallback([{ id: "not portable" }], [])).toThrow("portable ID characters");
  });
});
