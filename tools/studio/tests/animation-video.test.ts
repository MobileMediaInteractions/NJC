import { describe, expect, test } from "vitest";
import { videoFrameTimes } from "../src/lib/animation-video";

describe("rendered animation frame schedule", () => {
  test("includes exact first and final frames", () => {
    const times = videoFrameTimes(1_000, 30);
    expect(times).toHaveLength(31);
    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBe(1_000);
  });

  test("bounds duration and frame rate", () => {
    expect(() => videoFrameTimes(120_001, 30)).toThrow("120 seconds");
    expect(() => videoFrameTimes(1_000, 61)).toThrow("60 FPS");
  });
});
