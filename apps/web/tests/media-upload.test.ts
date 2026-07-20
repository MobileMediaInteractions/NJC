import assert from "node:assert/strict";
import test from "node:test";
import { MAX_STORY_IMAGE_BYTES, safeUploadFilename, validateStoryImage } from "../src/lib/media-upload";

test("accepts supported story images within the upload limit", () => {
  assert.equal(validateStoryImage({ type: "image/jpeg", size: MAX_STORY_IMAGE_BYTES }), null);
  assert.equal(validateStoryImage({ type: "image/png", size: 512 }), null);
  assert.equal(validateStoryImage({ type: "image/webp", size: 512 }), null);
});

test("rejects unsupported, oversized and empty uploads", () => {
  assert.match(validateStoryImage({ type: "image/gif", size: 512 }) ?? "", /JPEG/);
  assert.match(validateStoryImage({ type: "image/png", size: MAX_STORY_IMAGE_BYTES + 1 }) ?? "", /4 MB/);
  assert.match(validateStoryImage({ type: "image/png", size: 0 }) ?? "", /empty/);
});

test("creates a safe blob pathname segment", () => {
  assert.equal(safeUploadFilename("Council meeting (final).png"), "Council-meeting-final-.png");
  assert.equal(safeUploadFilename("../../"), "story-image");
});
