import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteStory, canManageSiteSettings, resolveStaffRole } from "../src/lib/auth";

test("Studio access requires an explicitly assigned staff role", () => {
  assert.equal(resolveStaffRole(undefined), null);
  assert.equal(resolveStaffRole("reader"), null);
  assert.equal(resolveStaffRole("contributor"), "contributor");
  assert.equal(resolveStaffRole("admin"), "admin");
});

test("only administrators and editors can permanently delete stories", () => {
  assert.equal(canDeleteStory("admin"), true);
  assert.equal(canDeleteStory("editor"), true);
  assert.equal(canDeleteStory("producer"), false);
  assert.equal(canDeleteStory("reporter"), false);
  assert.equal(canDeleteStory("contributor"), false);
});

test("only administrators can change production site settings", () => {
  assert.equal(canManageSiteSettings("admin"), true);
  assert.equal(canManageSiteSettings("editor"), false);
  assert.equal(canManageSiteSettings("producer"), false);
  assert.equal(canManageSiteSettings("reporter"), false);
  assert.equal(canManageSiteSettings("contributor"), false);
});
