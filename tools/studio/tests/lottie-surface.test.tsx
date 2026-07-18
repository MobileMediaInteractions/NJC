// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const player = vi.hoisted(() => ({
  destroy: vi.fn(),
  goToAndStop: vi.fn(),
  loadAnimation: vi.fn(),
}));

vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: { loadAnimation: player.loadAnimation },
}));

import { LottieSurface } from "../src/components/LottieSurface";

beforeEach(() => {
  player.destroy.mockReset();
  player.goToAndStop.mockReset();
  player.loadAnimation.mockReset().mockReturnValue({ destroy: player.destroy, goToAndStop: player.goToAndStop });
});

test("embedded Lottie data loads once, follows runtime time, and cleans up", () => {
  const document = { v: "5.5.8", w: 375, h: 812, fr: 30, ip: 0, op: 60, layers: [] };
  const encodedData = btoa(JSON.stringify(document));
  const view = render(<LottieSurface encodedData={encodedData} timeMs={500} frameRate={30} label="Imported animation" />);

  expect(screen.getByRole("img", { name: "Imported animation" })).toBeInTheDocument();
  expect(player.loadAnimation).toHaveBeenCalledOnce();
  expect(player.loadAnimation.mock.calls[0]?.[0]).toMatchObject({ renderer: "svg", loop: false, autoplay: false, animationData: document });
  expect(player.goToAndStop).toHaveBeenCalledWith(15, true);

  view.rerender(<LottieSurface encodedData={encodedData} timeMs={1_000} frameRate={30} label="Imported animation" />);
  expect(player.loadAnimation).toHaveBeenCalledOnce();
  expect(player.goToAndStop).toHaveBeenLastCalledWith(30, true);
  view.unmount();
  expect(player.destroy).toHaveBeenCalledOnce();
});

test("invalid embedded data fails closed without starting the player", () => {
  render(<LottieSurface encodedData="not-base64" timeMs={0} frameRate={30} label="Imported animation" />);
  expect(screen.getByRole("img", { name: "Imported animation could not be decoded" })).toBeInTheDocument();
  expect(player.loadAnimation).not.toHaveBeenCalled();
});
