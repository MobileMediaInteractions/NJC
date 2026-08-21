import assert from "node:assert/strict";
import test from "node:test";
import { configurationImpact, platformFeatureRegistry } from "../src/lib/platform-feature-registry";
import { defaultSiteConfiguration } from "../src/lib/site-settings";

test("registry keys are stable, unique and safety controls are immutable", () => {
  const keys = platformFeatureRegistry.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(platformFeatureRegistry.filter((entry) => entry.classification === "mandatory-safety-control").every((entry) => !entry.configurationPath && entry.defaultState === "required"));
});

test("impact preview maps a runtime change to affected platforms", () => {
  const next = structuredClone(defaultSiteConfiguration);
  next.features.pseudonyms = false;
  const impact = configurationImpact(defaultSiteConfiguration, next);
  assert.deepEqual(impact.map((entry) => entry.key), ["reader.pseudonyms"]);
  assert.ok(impact[0]?.platforms.includes("studio"));
});

test("impact preview tracks V2 composition changes without flagging equal arrays", () => {
  const unchanged = structuredClone(defaultSiteConfiguration);
  assert.equal(
    configurationImpact(defaultSiteConfiguration, unchanged).some(
      (entry) => entry.key === "reader.presentation.v2-composition",
    ),
    false,
  );

  const changed = structuredClone(defaultSiteConfiguration);
  changed.presentation.v2.homepageModules = ["lead", "latest"];
  assert.equal(
    configurationImpact(defaultSiteConfiguration, changed).some(
      (entry) => entry.key === "reader.presentation.v2-composition",
    ),
    true,
  );
});
