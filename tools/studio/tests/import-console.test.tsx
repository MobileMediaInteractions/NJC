// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { ImportConsole } from "../src/components/ImportConsole";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

test("live import console exposes ordered stages and running state", () => {
  const onClear = vi.fn();
  render(<ImportConsole running lines={[
    { id: 1, timestamp: "22:40:01", phase: "select", status: "success", message: "Selected pulse.json." },
    { id: 2, timestamp: "22:40:02", phase: "validate", status: "running", message: "$ lottie validate --schema --security --compatibility" },
  ]} onClear={onClear} />);
  expect(screen.getByText("IMPORT RUNNING")).toBeInTheDocument();
  expect(screen.getByRole("log")).toHaveTextContent("Selected pulse.json");
  expect(screen.getByRole("log")).toHaveTextContent("lottie validate");
  expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
});

test("finished import console can be cleared", () => {
  const onClear = vi.fn();
  render(<ImportConsole running={false} lines={[{ id: 3, timestamp: "22:40:03", phase: "complete", status: "success", message: "READY animations/pulse.pani" }]} onClear={onClear} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(onClear).toHaveBeenCalledOnce();
});
