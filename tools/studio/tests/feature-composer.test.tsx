// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { FeatureComposer } from "../src/composer/FeatureComposer";

test("Composer synchronizes design, behavior, source, compile and test modes", async () => {
  render(<FeatureComposer />);
  expect(screen.getByRole("region", { name: "Visual Feature Composer" })).toBeInTheDocument();
  expect(screen.getByText("Studio Headphones")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Blueprints" }));
  expect(screen.getByRole("region", { name: "NJC Blueprint graph" })).toBeInTheDocument();
  expect(screen.getByText("Ask for confirmation")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  const source = screen.getByRole("textbox", { name: "Readable feature source" });
  fireEvent.change(source, { target: { value: (source as HTMLTextAreaElement).value.replace('Add button BuyButton saying "Purchase"', 'Add button BuyButton saying "Buy now"') } });
  fireEvent.click(screen.getByRole("button", { name: "Apply to visual model" }));
  expect(screen.getByText("Source and Feature IR agree")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Design" }));
  expect(screen.getByRole("button", { name: "Buy now" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Test" }));
  fireEvent.click(screen.getByRole("button", { name: /Run recorded interaction test/ }));
  await waitFor(() => expect(screen.getByText("✓ All guided assertions passed")).toBeInTheDocument());
});
