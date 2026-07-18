// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Explorer } from "../src/project-system/Explorer";

test("project explorer exposes keyboard-addressable files and current state", () => {
  render(<Explorer files={[{ path: "animations/demo.pani", name: "demo.pani", kind: "file", depth: 1, size: 42 }]} activePath="animations/demo.pani" onOpen={vi.fn()} onCreate={vi.fn()} onRefresh={vi.fn()} />);
  expect(screen.getByRole("navigation", { name: "Project files" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /demo.pani/ })).toHaveAttribute("aria-current", "page");
});
