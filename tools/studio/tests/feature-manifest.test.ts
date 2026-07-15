import { expect, test } from "vitest";
import { parseFeatureManifest } from "@platform/runtime/core";
import manifestSource from "../src/demo/licensed-feature.json?raw";

test("built-in licensed feature uses the authoritative manifest schema", () => {
  const manifest = parseFeatureManifest(JSON.parse(manifestSource));
  expect(manifest.licenseEntitlement).toBe("studio.demo");
  expect(manifest.requiredHostCapabilities).toContain("animation");
});
