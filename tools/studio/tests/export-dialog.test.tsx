// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ExportDialog } from "../src/components/ExportDialog";

test("rendered video export submits the selected timeline and frame rate", () => {
  const onExport = vi.fn();
  render(<ExportDialog open busy={false} progress={null} initialKind="mp4" timelines={[{ name: "entrance", durationMs: 1_200 }, { name: "exit", durationMs: 600 }]} selectedTimeline="entrance" width={390} height={844} onClose={vi.fn()} onExport={onExport} />);
  expect(screen.getByText("390 × 844")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Timeline"), { target: { value: "exit" } });
  fireEvent.change(screen.getByLabelText("Frame rate"), { target: { value: "60" } });
  fireEvent.click(screen.getByRole("button", { name: "Export .mp4" }));
  expect(onExport).toHaveBeenCalledWith("mp4", "exit", 60);
});
