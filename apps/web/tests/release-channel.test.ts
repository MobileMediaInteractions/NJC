import assert from "node:assert/strict";
import test from "node:test";
import { resolveReleaseChannel } from "../src/lib/release-channel";

test("release channels fail closed to production", () => {
  assert.equal(resolveReleaseChannel(undefined), "production");
  assert.equal(resolveReleaseChannel({}), "production");
  assert.equal(resolveReleaseChannel({ releaseChannel: "preview" }), "production");
  assert.equal(resolveReleaseChannel({ releaseChannel: true }), "production");
});

test("explicit alpha and beta account metadata enables prerelease access", () => {
  assert.equal(resolveReleaseChannel({ releaseChannel: "beta" }), "beta");
  assert.equal(resolveReleaseChannel({ release_channel: "alpha" }), "alpha");
  assert.equal(resolveReleaseChannel({ betaAccess: true }), "beta");
});

test("a false beta marker never grants access", () => {
  assert.equal(resolveReleaseChannel({ betaAccess: false }), "production");
  assert.equal(resolveReleaseChannel({ beta_access: "true" }), "production");
});
