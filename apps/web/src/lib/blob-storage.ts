export function getPublicBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export function getPrivateBlobToken() {
  return process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
}

export function hasPublicBlobStorage() {
  return Boolean(getPublicBlobToken());
}

export function hasPrivateBlobStorage() {
  return Boolean(getPrivateBlobToken());
}
