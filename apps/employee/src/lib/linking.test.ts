import assert from "node:assert/strict";
import test from "node:test";
import { buildEmployeeDeepLink, parseEmployeeDeepLink } from "@harborline/contracts";
import { routeForResolvedLink } from "./linking";

test("employee links round trip through the allow list", () => {
  const url = buildEmployeeDeepLink({ version: 1, destination: { kind: "tool", tool: "editorial" } });
  assert.deepEqual(parseEmployeeDeepLink(url)?.destination, { kind: "tool", tool: "editorial" });
  assert.equal(routeForResolvedLink(url), "/tools/editorial");
});
test("arbitrary routes and malformed resource ids are rejected", () => {
  assert.equal(parseEmployeeDeepLink("njcourier-employee://v1/tools/secrets"), null);
  assert.equal(parseEmployeeDeepLink("njcourier-employee://v1/chat/channel/not-an-id"), null);
});
test("license administration links stay in the versioned tool allow list", () => {
  const url = buildEmployeeDeepLink({ version: 1, destination: { kind: "tool", tool: "licensing" } });
  assert.deepEqual(parseEmployeeDeepLink(url)?.destination, { kind: "tool", tool: "licensing" });
});
