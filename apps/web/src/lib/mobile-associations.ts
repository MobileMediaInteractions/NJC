export const readerUniversalLinkPaths = [
  "/story/*",
  "/latest",
  "/weather",
  "/watch",
] as const;

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function fingerprints(value: string | undefined) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => /^([0-9a-f]{2}:){31}[0-9a-f]{2}$/i.test(item)) ?? [];
}

export function buildAppleAppSiteAssociation(input: {
  readerAppId?: string;
  employeeAppId?: string;
}) {
  const details: Array<{ appID: string; paths: string[] }> = [];
  const readerAppId = clean(input.readerAppId);
  const employeeAppId = clean(input.employeeAppId);
  if (readerAppId) {
    details.push({ appID: readerAppId, paths: [...readerUniversalLinkPaths] });
  }
  if (employeeAppId) {
    details.push({ appID: employeeAppId, paths: ["/employee-link/*"] });
  }
  return { applinks: { apps: [], details } };
}

export function buildAndroidAssetLinks(input: {
  readerPackage?: string;
  readerFingerprints?: string;
  employeePackage?: string;
  employeeFingerprints?: string;
}) {
  const entries: Array<{
    relation: string[];
    target: {
      namespace: "android_app";
      package_name: string;
      sha256_cert_fingerprints: string[];
    };
  }> = [];
  const add = (packageNameValue: string | undefined, fingerprintValue: string | undefined) => {
    const packageName = clean(packageNameValue);
    const sha256CertFingerprints = fingerprints(fingerprintValue);
    if (!packageName || !sha256CertFingerprints.length) return;
    entries.push({
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: sha256CertFingerprints,
      },
    });
  };

  add(input.readerPackage, input.readerFingerprints);
  add(input.employeePackage, input.employeeFingerprints);
  return entries;
}
