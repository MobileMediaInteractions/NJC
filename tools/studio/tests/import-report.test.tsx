// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ImportReportDialog } from "../src/components/ImportReportDialog";

test("successful Lottie translation explains the editable output", () => {
  const onClose = vi.fn();
  render(<ImportReportDialog onClose={onClose} outcome={{
    file: { path: "animations/pulse.pani", content: "language 1", sha256: "abc", size: 10 },
    format: "lottie", sourceName: "pulse.json",
    summary: { valid: true, sourceVersion: "5.12.2", width: 390, height: 844, frameRate: 30, durationMs: 2_000, layers: 3, components: 3, errors: 0, warnings: 1 },
    report: [{ source: "Pulse.position", disposition: "approximated", message: "Spatial motion tangents are translated as straight-line position keyframes" }],
  }} />);
  expect(screen.getByRole("heading", { name: "Lottie translated to editable PANI" })).toBeInTheDocument();
  expect(screen.getByText("390 × 844")).toBeInTheDocument();
  expect(screen.getByText("Approximation")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open project" }));
  expect(onClose).toHaveBeenCalledOnce();
});

test("blocked translation states that no partial project was created", () => {
  render(<ImportReportDialog onClose={vi.fn()} outcome={{
    file: null, format: "lottie", sourceName: "effects.json",
    report: [{ source: "Glow.effects", disposition: "unsupported_with_error", message: "Lottie effects cannot be translated without changing the rendered result" }],
  }} />);
  expect(screen.getByRole("heading", { name: "Translation stopped safely" })).toBeInTheDocument();
  expect(screen.getByText(/No partial project was created/)).toBeInTheDocument();
  expect(screen.getByText("Blocked")).toBeInTheDocument();
});

test("lossless translation explains that advanced JSON stays intact", () => {
  render(<ImportReportDialog onClose={vi.fn()} outcome={{
    file: { path: "animations/advanced.pani", content: "language 1", sha256: "abc", size: 10 },
    format: "lottie", sourceName: "advanced.json",
    summary: { valid: true, sourceVersion: "5.5.8", width: 375, height: 812, frameRate: 30, durationMs: 60_000, layers: 4, components: 1, errors: 0, warnings: 0 },
    report: [{ source: "editable source", disposition: "converted", message: "Advanced animation data is embedded" }],
  }} />);
  expect(screen.getByRole("heading", { name: "Lottie preserved as an editable project" })).toBeInTheDocument();
  expect(screen.getByText(/complete validated Lottie JSON is embedded/)).toBeInTheDocument();
});
