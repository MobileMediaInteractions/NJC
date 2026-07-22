import assert from "node:assert/strict";
import test from "node:test";
import { canChangeManagedRole, studioAccountUpdateSchema } from "../src/lib/studio-account-policy";

test("user profile updates accept every managed role and reader access", () => {
  for (const role of ["admin", "editor", "producer", "reporter", "contributor", null]) {
    assert.equal(studioAccountUpdateSchema.safeParse({ firstName: "Alex", lastName: "Rivera", title: "Reporter", role }).success, true);
  }
});

test("user profile updates reject arbitrary roles and oversized identity fields", () => {
  assert.equal(studioAccountUpdateSchema.safeParse({ firstName: "Alex", lastName: "Rivera", title: "Reporter", role: "owner" }).success, false);
  assert.equal(studioAccountUpdateSchema.safeParse({ firstName: "x".repeat(101), lastName: "Rivera", title: "Reporter", role: "reporter" }).success, false);
});

test("administrators cannot remove or change their own role", () => {
  assert.equal(canChangeManagedRole({ actorId: "user_1", targetId: "user_1", currentRole: "admin", nextRole: "editor" }), false);
  assert.equal(canChangeManagedRole({ actorId: "user_1", targetId: "user_1", currentRole: "admin", nextRole: null }), false);
  assert.equal(canChangeManagedRole({ actorId: "user_1", targetId: "user_1", currentRole: "admin", nextRole: "admin" }), true);
});

test("administrators can change another account role", () => {
  assert.equal(canChangeManagedRole({ actorId: "user_admin", targetId: "user_reporter", currentRole: "reporter", nextRole: "editor" }), true);
  assert.equal(canChangeManagedRole({ actorId: "user_admin", targetId: "user_reader", currentRole: null, nextRole: "contributor" }), true);
});
