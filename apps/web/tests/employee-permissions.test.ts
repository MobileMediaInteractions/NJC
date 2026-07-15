import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionAccessRequest, resolveEmployeeCapabilities } from "../src/lib/employee-permissions";
import { sanitizeEmployeeMessage } from "../src/lib/employee-chat";

test("role defaults are narrowed by active deny grants", () => {
  const capabilities = resolveEmployeeCapabilities("editor", [{ capability: "tools:alerts", effect: "deny" }]);
  assert.equal(capabilities.includes("employee:access"), true);
  assert.equal(capabilities.includes("tools:alerts"), false);
});
test("revocation of employee access removes every privileged capability", () => {
  const capabilities = resolveEmployeeCapabilities("admin", [{ capability: "employee:access", effect: "deny" }]);
  assert.deepEqual(capabilities, []);
});
test("expired grants do not authorize a contributor", () => {
  const capabilities = resolveEmployeeCapabilities("contributor", [{ capability: "employee:access", effect: "allow", expiresAt: new Date(0) }]);
  assert.deepEqual(capabilities, []);
});
test("reviewers cannot approve their own request or replay a decision", () => {
  assert.equal(canTransitionAccessRequest("pending", "approved", true), false);
  assert.equal(canTransitionAccessRequest("approved", "denied", false), false);
  assert.equal(canTransitionAccessRequest("pending", "denied", false), true);
});
test("message sanitizer removes control characters without rewriting content", () => {
  assert.equal(sanitizeEmployeeMessage("  hello\u0000 team  "), "hello team");
});
