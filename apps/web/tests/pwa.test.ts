import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import manifest from "../src/app/manifest";

test("manifest provides a standalone Courier install with required icons", () => {
  const value = manifest();
  assert.equal(value.id, "/");
  assert.equal(value.scope, "/");
  assert.equal(value.start_url, "/");
  assert.equal(value.display, "standalone");
  assert.equal(value.prefer_related_applications, false);

  const icons = value.icons ?? [];
  assert.ok(icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(
    icons.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
    ),
  );
  assert.deepEqual(
    value.shortcuts?.map((shortcut) => shortcut.short_name),
    ["Latest", "Weather", "Send a tip"],
  );
});

test("PWA icon files match the install sizes advertised by the manifest", async () => {
  const publicAssets = path.join(process.cwd(), "public/assets/brand/v1");
  await Promise.all(
    [
      "app-icon-192.png",
      "app-icon-512.png",
      "app-icon-maskable-512.png",
      "apple-touch-icon.png",
    ].map(async (file) => {
      const contents = await readFile(path.join(publicAssets, file));
      assert.equal(contents.subarray(1, 4).toString("ascii"), "PNG");
    }),
  );
});

test("the shared push worker also owns a bounded public offline cache", async () => {
  const source = await readFile(
    path.join(process.cwd(), "public/njc-push-sw.js"),
    "utf8",
  );
  assert.match(source, /addEventListener\("install"/);
  assert.match(source, /addEventListener\("activate"/);
  assert.match(source, /addEventListener\("fetch"/);
  assert.match(source, /const offlineDestination = "\/offline"/);
  assert.match(source, /trimCache\(cache, limit\)/);
  assert.match(source, /"\/studio"/);
  assert.match(source, /"\/api"/);
  assert.match(source, /"\/profile"/);
  assert.match(source, /"\/distribution"/);
  assert.match(source, /"\/plus"/);
  assert.match(source, /"\/employee-link"/);
});
