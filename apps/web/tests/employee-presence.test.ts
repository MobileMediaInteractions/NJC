import assert from "node:assert/strict";
import test from "node:test";
import {
  detectBrowserPresencePlatform,
  formatPresenceLastSeen,
  resolveEmployeePresence,
} from "../src/lib/employee-presence";

test("preserves active DND presence and the reporting platform", () => {
  const now = new Date("2026-07-22T19:00:00.000Z");
  const presence = resolveEmployeePresence({
    userClerkId: "user_1",
    status: "dnd",
    platform: "macos",
    lastSeenAt: new Date(now.getTime() - 30_000),
  }, now);
  assert.equal(presence.status, "dnd");
  assert.equal(presence.platform, "macos");
});

test("stale presence fails closed to offline without losing last-seen time", () => {
  const now = new Date("2026-07-22T19:00:00.000Z");
  const lastSeenAt = new Date(now.getTime() - 120_000);
  const presence = resolveEmployeePresence({ userClerkId: "user_1", status: "online", platform: "ios", lastSeenAt }, now);
  assert.equal(presence.status, "offline");
  assert.equal(presence.lastSeenAt?.toISOString(), lastSeenAt.toISOString());
  assert.equal(formatPresenceLastSeen(lastSeenAt, now), "Last online 2m ago");
});

test("browser platform detection distinguishes mobile and desktop activity", () => {
  assert.equal(detectBrowserPresencePlatform("Mozilla/5.0 (Linux; Android 15)"), "android");
  assert.equal(detectBrowserPresencePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "ios");
  assert.equal(detectBrowserPresencePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), "macos");
  assert.equal(detectBrowserPresencePlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "windows");
});
