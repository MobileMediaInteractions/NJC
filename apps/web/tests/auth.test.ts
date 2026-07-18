import assert from "node:assert/strict";
import test from "node:test";
import { resolveStaffRole } from "../src/lib/auth";

test("Studio access requires an explicitly assigned staff role", () => {
  assert.equal(resolveStaffRole(undefined), null);
  assert.equal(resolveStaffRole("reader"), null);
  assert.equal(resolveStaffRole("contributor"), "contributor");
  assert.equal(resolveStaffRole("admin"), "admin");
});
