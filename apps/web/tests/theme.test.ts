import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptiveThemePreferences,
  nextAdaptiveThemePreference,
  normalizeThemePreference,
  oppositeTheme,
} from "@harborline/contracts";

test("dark system appearance only offers System and Light", () => {
  assert.deepEqual(adaptiveThemePreferences("dark"), ["system", "light"]);
  assert.equal(oppositeTheme("dark"), "light");
  assert.equal(nextAdaptiveThemePreference("system", "dark"), "light");
  assert.equal(nextAdaptiveThemePreference("light", "dark"), "system");
});

test("light system appearance only offers System and Dark", () => {
  assert.deepEqual(adaptiveThemePreferences("light"), ["system", "dark"]);
  assert.equal(oppositeTheme("light"), "dark");
  assert.equal(nextAdaptiveThemePreference("system", "light"), "dark");
  assert.equal(nextAdaptiveThemePreference("dark", "light"), "system");
});

test("a redundant explicit preference collapses back to System", () => {
  assert.equal(normalizeThemePreference("dark", "dark"), "system");
  assert.equal(normalizeThemePreference("light", "light"), "system");
  assert.equal(normalizeThemePreference("light", "dark"), "light");
  assert.equal(normalizeThemePreference("dark", "light"), "dark");
});
