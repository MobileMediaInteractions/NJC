import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrivateBlobToken,
  getPublicBlobToken,
  hasPrivateBlobStorage,
  hasPublicBlobStorage,
} from "../src/lib/blob-storage";

test("public and private Blob stores use independent credentials", () => {
  const previousPublic = process.env.BLOB_READ_WRITE_TOKEN;
  const previousPrivate = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;

  process.env.BLOB_READ_WRITE_TOKEN = "public-test-token";
  delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  assert.equal(getPublicBlobToken(), "public-test-token");
  assert.equal(hasPublicBlobStorage(), true);
  assert.equal(getPrivateBlobToken(), undefined);
  assert.equal(hasPrivateBlobStorage(), false);

  process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "private-test-token";
  assert.equal(getPrivateBlobToken(), "private-test-token");
  assert.equal(hasPrivateBlobStorage(), true);

  if (previousPublic === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = previousPublic;
  if (previousPrivate === undefined) delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  else process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = previousPrivate;
});
