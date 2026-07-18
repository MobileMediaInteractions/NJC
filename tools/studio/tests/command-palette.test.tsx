// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CommandPalette } from "../src/components/CommandPalette";

test("command search filters and executes the first result with Enter", () => {
  const runBuild = vi.fn();
  const onClose = vi.fn();
  render(<CommandPalette open commands={[{ id: "new", label: "Create Animation", run: vi.fn() }, { id: "build", label: "Build Current", run: runBuild }]} onClose={onClose} />);
  const search = screen.getByRole("textbox", { name: "Search commands" });
  fireEvent.change(search, { target: { value: "build" } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(runBuild).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});
