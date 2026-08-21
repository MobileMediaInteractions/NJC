import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
} from "../src/lib/mobile-associations";
import {
  detectReaderNativePlatform,
  readerNativeDeepLink,
  readerNativePath,
} from "../src/lib/native-app-handoff";

test("mobile associations preserve employee links and add only supported reader routes", () => {
  const association = buildAppleAppSiteAssociation({
    readerAppId: "TEAM123456.com.mobilemediainteractions.thenews",
    employeeAppId: "TEAM123456.com.mobilemediainteractions.thenews.employee",
  });
  assert.deepEqual(association.applinks.details, [
    {
      appID: "TEAM123456.com.mobilemediainteractions.thenews",
      paths: [
        "/story/*",
        "/latest",
        "/weather",
        "/watch",
      ],
    },
    {
      appID: "TEAM123456.com.mobilemediainteractions.thenews.employee",
      paths: ["/employee-link/*"],
    },
  ]);
});

test("Android asset links include reader and employee signing identities independently", () => {
  const readerFingerprint = Array.from({ length: 32 }, () => "AA").join(":");
  const rotatedReaderFingerprint = Array.from({ length: 32 }, () => "CC").join(":");
  const employeeFingerprint = Array.from({ length: 32 }, () => "EE").join(":");
  const entries = buildAndroidAssetLinks({
    readerPackage: "com.mobilemediainteractions.thenews",
    readerFingerprints: `${readerFingerprint}, ${rotatedReaderFingerprint}`,
    employeePackage: "com.mobilemediainteractions.thenews.employee",
    employeeFingerprints: employeeFingerprint,
  });
  assert.deepEqual(entries.map((entry) => entry.target), [
    {
      namespace: "android_app",
      package_name: "com.mobilemediainteractions.thenews",
      sha256_cert_fingerprints: [readerFingerprint, rotatedReaderFingerprint],
    },
    {
      namespace: "android_app",
      package_name: "com.mobilemediainteractions.thenews.employee",
      sha256_cert_fingerprints: [employeeFingerprint],
    },
  ]);
  assert.deepEqual(buildAndroidAssetLinks({ readerPackage: "reader", readerFingerprints: "" }), []);
});

test("reader handoff detects mobile platforms and never forwards unsupported paths", () => {
  assert.equal(detectReaderNativePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "ios");
  assert.equal(detectReaderNativePlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)"), "android");
  assert.equal(detectReaderNativePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), null);
  assert.equal(readerNativePath("/story/election-results"), "/story/election-results");
  assert.equal(readerNativePath("/category/politics"), "/");
  assert.equal(readerNativeDeepLink("/story/election-results", "?source=x"), "njcourier://story/election-results?source=x");
  assert.equal(readerNativeDeepLink("/legal", "?unsafe=true"), "njcourier://");
});
