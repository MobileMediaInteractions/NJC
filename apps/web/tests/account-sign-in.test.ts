import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ACCOUNT_CONTINUE_PATH, accountContinueUrl, accountLandingPath, safeAccountReturnTo } from "../src/lib/account-sign-in";

const origin = "https://www.thejerseycourier.com";
const studio = "https://studio.thejerseycourier.com";
test("staff land in Studio after a main-site login while readers land in Profile", () => {
  for (const role of ["admin", "editor", "producer", "reporter", "contributor"]) assert.equal(accountLandingPath(role, studio), studio);
  for (const role of ["reader", undefined, "fake-admin"]) assert.equal(accountLandingPath(role, studio), "/profile");
  assert.equal(accountLandingPath("editor"), "/studio");
});
test("intended same-site and explicitly trusted Studio destinations survive login", () => {
  assert.equal(safeAccountReturnTo("/plus/account", origin), "/plus/account");
  assert.equal(safeAccountReturnTo(`${origin}/developers`, origin), "/developers");
  assert.equal(safeAccountReturnTo(`${studio}/stories`, origin, [studio]), `${studio}/stories`);
  assert.equal(accountContinueUrl("/login/tv?session=example", origin), `${ACCOUNT_CONTINUE_PATH}?returnTo=${encodeURIComponent("/login/tv?session=example")}`);
});
test("account continuation rejects open redirects, unsafe URLs and authentication loops", () => {
  for (const value of ["https://evil.example", "https://studio.thejerseycourier.com.evil.example/", "//evil.example", "javascript:alert(1)", "/\\evil.example", "/%5cevil.example", "/%2f%2fevil.example", "https://user@www.thejerseycourier.com/", "/sign-in", "/sign-up/choose", "/studio/sign-in", "/auth/continue?returnTo=/profile", "/%61uth/continue", "not-a-path", "\n/profile", ["/profile"]]) assert.equal(safeAccountReturnTo(value, origin, [studio]), null, String(value));
  assert.equal(accountContinueUrl("https://evil.example", origin), ACCOUNT_CONTINUE_PATH);
});
test("provider fallbacks use the verified continuation without custom token persistence", () => {
  const provider = readFileSync(new URL("../src/components/app-providers.tsx", import.meta.url), "utf8");
  assert.match(provider, /signInFallbackRedirectUrl=\{ACCOUNT_CONTINUE_PATH\}/);
  assert.match(provider, /signUpFallbackRedirectUrl=\{ACCOUNT_CONTINUE_PATH\}/);
  assert.doesNotMatch(provider, /localStorage|document\.cookie|expireSessions/);
  const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /"\/auth\/continue"/);
});
