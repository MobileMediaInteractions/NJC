import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { readThemePreference, restoreThemePreference, themeBootstrapScript, themeStorageKey } from "../src/lib/theme";

function boot(saved: string | null, systemDark: boolean, storageBlocked = false) {
  const classes = new Set<string>();
  const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string>, classList: { toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name) } };
  const writes: string[] = [];
  runInNewContext(themeBootstrapScript, {
    localStorage: { getItem: (key: string) => { assert.equal(key, themeStorageKey); if (storageBlocked) throw new Error("Blocked"); return saved; }, setItem: (...values: string[]) => writes.push(...values) },
    matchMedia: () => ({ matches: systemDark }), document: { documentElement: root },
  });
  return { root, classes, writes };
}
test("explicit Dark survives reload and system appearance changes without becoming System", () => {
  for (const systemDark of [false, true, false]) {
    const result = boot("dark", systemDark);
    assert.equal(result.classes.has("dark"), true);
    assert.equal(result.root.dataset.theme, "dark");
    assert.equal(result.root.dataset.themePreference, "dark");
    assert.equal(result.root.dataset.bsTheme, "dark");
    assert.equal(result.root.style.colorScheme, "dark");
    assert.deepEqual(result.writes, []);
  }
});
test("System follows the device and Light remains explicit", () => {
  assert.equal(boot("system", true).classes.has("dark"), true);
  assert.equal(boot("system", false).classes.has("dark"), false);
  assert.equal(boot("light", true).root.dataset.theme, "light");
});
test("blocked preference storage still applies the system theme before paint", () => {
  const result = boot(null, true, true);
  assert.equal(result.classes.has("dark"), true);
  assert.equal(result.root.style.colorScheme, "dark");
});

test("invalid or missing saved appearance follows System without writing storage", () => {
  for (const saved of [null, "garbage", "DARK"]) {
    assert.equal(boot(saved, true).root.dataset.themePreference, "system");
    assert.equal(boot(saved, true).root.dataset.theme, "dark");
    assert.deepEqual(boot(saved, true).writes, []);
  }
});

test("restoring a cached document reads the newest saved preference, or retains it if storage is blocked", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  try {
    Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { dataset: { themePreference: "dark" } } } });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => "light" } } });
    assert.equal(readThemePreference(), "dark");
    assert.equal(restoreThemePreference(), "light");
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => { throw new Error("Blocked"); } } } });
    assert.equal(restoreThemePreference(), "dark");
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else Reflect.deleteProperty(globalThis, "document");
  }
});
