import assert from "node:assert/strict";
import test from "node:test";
import manifest from "../src/app/manifest";
import { GET } from "../src/app/favicon/route";
import { faviconSize } from "../src/lib/favicon";

test("favicon has a stable crawlable URL and Google-sized square dimensions", async () => {
  assert.deepEqual(faviconSize, { width: 64, height: 64 });
  assert.ok(
    manifest().icons?.some(
      (icon) =>
        icon.src === "/favicon" &&
        icon.sizes === "64x64" &&
        icon.type === "image/png",
    ),
  );

  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});
