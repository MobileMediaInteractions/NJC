import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { createPressKitArchive, pressKitRequestSchema } from "../src/lib/press-kit";

test("press kit validates a media request and packages every approved group", async () => {
  const request = pressKitRequestSchema.parse({
    name: "Jordan Rivera",
    organization: "Garden State Public Radio",
    email: "Jordan@Example.com",
    intendedUse: "broadcast",
    requestDetails: "Preparing a local-news segment about the publication launch.",
    assetGroups: ["logos", "publication", "editorial"],
    acceptsTerms: true,
    website: "",
  });
  assert.equal(request.email, "jordan@example.com");

  const archive = await createPressKitArchive(request, {
    requestId: "11111111-1111-4111-8111-111111111111",
    generatedAt: new Date("2026-07-14T12:00:00.000Z"),
  });
  assert.ok(archive.buffer.byteLength < 4_250_000);

  const zip = await JSZip.loadAsync(archive.buffer);
  assert.ok(zip.file("NJ-Courier-Press-Kit/brand/logos/wordmark.svg"));
  assert.ok(zip.file("NJ-Courier-Press-Kit/publication/fact-sheet.txt"));
  assert.ok(zip.file("NJ-Courier-Press-Kit/editorial/garden-state-engraving.png"));
  const summary = await zip.file("NJ-Courier-Press-Kit/request/request-summary.txt")?.async("string");
  assert.match(summary ?? "", /Garden State Public Radio/);
  assert.match(summary ?? "", /local-news segment/);
  const manifest = JSON.parse(await zip.file("NJ-Courier-Press-Kit/manifest.json")!.async("string")) as { requestId: string; files: unknown[] };
  assert.equal(manifest.requestId, "11111111-1111-4111-8111-111111111111");
  assert.ok(manifest.files.length >= 10);
});
