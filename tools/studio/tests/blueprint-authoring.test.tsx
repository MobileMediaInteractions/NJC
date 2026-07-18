// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createPurchaseFeature } from "@visual-feature/model/examples";
import { expect, test, vi } from "vitest";
import { ComposerBehavior } from "../src/composer/ComposerBehavior";

test("NJC Blueprints expose typed nodes, schema actions, inspection and keyboard movement", () => {
  const feature = createPurchaseFeature();
  const selected = feature.screens[0]!.root.children.find((component) => component.name === "BuyButton")!;
  const flow = feature.behaviors[0]!;
  const onAddAction = vi.fn();
  const onMoveNode = vi.fn();
  const onAutoArrange = vi.fn().mockResolvedValue(undefined);
  render(<ComposerBehavior selected={selected} flow={flow} source="When BuyButton is tapped:" onAddAction={onAddAction} onMoveNode={onMoveNode} onAutoArrange={onAutoArrange} arranging={false} />);

  expect(screen.getByRole("region", { name: "NJC Blueprint graph" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "＋navigate" }));
  expect(onAddAction).toHaveBeenCalledWith("navigate");

  const actionNode = screen.getByRole("button", { name: "Purchase SelectedProduct Blueprint node" });
  fireEvent.click(actionNode);
  expect(screen.getByText("behavior.buy.action")).toBeInTheDocument();
  fireEvent.keyDown(actionNode, { key: "ArrowRight", altKey: true });
  expect(onMoveNode).toHaveBeenCalledWith("behavior.buy.action", { x: 25, y: 560 });
  fireEvent.click(screen.getByRole("button", { name: "Auto arrange" }));
  expect(onAutoArrange).toHaveBeenCalledOnce();
});
