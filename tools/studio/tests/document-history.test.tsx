// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useDocumentHistory } from "../src/hooks/use-document-history";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("clearing recovery cancels a pending snapshot after a successful save", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.useFakeTimers();
  const { result } = renderHook(() => useDocumentHistory("original", "studio:test-recovery"));
  act(() => result.current.setSource("edited"));
  act(() => result.current.clearRecovery());
  act(() => vi.advanceTimersByTime(1_000));
  expect(values.has("studio:test-recovery")).toBe(false);
});

test("clean source is never retained as a recovery snapshot", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.useFakeTimers();
  renderHook(() => useDocumentHistory("disk source", "studio:clean-recovery", "disk source"));
  act(() => vi.advanceTimersByTime(1_000));
  expect(values.has("studio:clean-recovery")).toBe(false);
});
