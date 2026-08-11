import { createHash } from "node:crypto";
import JSZip from "jszip";
import {
  PRESS_LICENSE_VERSION,
  PRESS_POLICY_VERSION,
  pressLicenseText,
  type PressPolicyDecision,
  type PressRequestProfile,
} from "@/lib/press-kit-policy";
import { siteConfig } from "@/lib/site";

export type PreparedPressAsset = {
  asset: {
    id: string; slug: string; title: string; category: string; mimeType: string;
    version: string; attribution: string | null; restrictions: string[];
  };
  body: Buffer;
  destination: string;
  sha256: string;
};

export const MAX_AUTHORIZED_PRESS_PACKAGE_BYTES = 40_000_000;

function requestSummary(input: PressRequestProfile, requestId: string, generatedAt: string) {
  return `PRESS KIT REQUEST\n\nRequest ID: ${requestId}\nGenerated: ${generatedAt}\nRequested by: ${input.name}\nOrganization: ${input.organization}\nRole: ${input.requesterRole}\nEmail: ${input.email}\nCountry or jurisdiction: ${input.country}\nProject: ${input.projectName}\nUse classification: ${input.usageClassification}\nWhere the materials will appear: ${input.whereUsed}\nExpected release: ${input.expectedReleaseAt || "Not supplied"}\n\nRequester description\n${input.requestDetails}\n`;
}

export async function buildAuthorizedPressArchive(input: {
  requestId: string;
  licenseId: string;
  generatedAt: Date;
  expiresAt: Date;
  profile: PressRequestProfile;
  decision: PressPolicyDecision;
  licensePdf: Uint8Array;
  assets: PreparedPressAsset[];
}) {
  if (!input.decision.licenseType || !input.decision.approvedAssetIds.length) throw new Error("An approved asset decision is required");
  const approved = new Set(input.decision.approvedAssetIds);
  if (input.assets.length !== approved.size || input.assets.some((item) => !approved.has(item.asset.id))) throw new Error("Archive assets do not exactly match the approved set");
  if (input.assets.some((item) => !item.destination || item.destination.startsWith("/") || item.destination.includes("\\") || item.destination.split("/").some((segment) => segment === ".." || segment === "."))) throw new Error("Archive destination is unsafe");
  const assetBytes = input.assets.reduce((sum, item) => sum + item.body.byteLength, 0);
  if (assetBytes > MAX_AUTHORIZED_PRESS_PACKAGE_BYTES) throw new Error("Approved press assets exceed the package safety limit");
  const root = "New-Jersey-Courier-Press-Kit";
  const generatedAt = input.generatedAt.toISOString();
  const manifest = {
    format: "njc-authorized-press-kit-v2",
    requestId: input.requestId,
    licenseId: input.licenseId,
    licenseVersion: PRESS_LICENSE_VERSION,
    policyVersion: PRESS_POLICY_VERSION,
    generatedAt,
    packageExpiresAt: input.expiresAt.toISOString(),
    requester: { name: input.profile.name, organization: input.profile.organization },
    approvedUsage: { project: input.profile.projectName, classification: input.profile.usageClassification, whereUsed: input.profile.whereUsed },
    restrictions: input.decision.restrictions,
    assets: input.assets.map(({ asset, body, destination, sha256 }) => ({
      id: asset.id, slug: asset.slug, title: asset.title, category: asset.category,
      mimeType: asset.mimeType, version: asset.version, path: `${root}/${destination}`,
      bytes: body.byteLength, sha256, attribution: asset.attribution, restrictions: asset.restrictions,
    })),
  };
  const zip = new JSZip();
  const stableDate = new Date("1980-01-01T00:00:00.000Z");
  for (const item of input.assets) zip.file(`${root}/${item.destination}`, item.body, { date: stableDate });
  zip.file(`${root}/LICENSE.pdf`, input.licensePdf, { date: stableDate });
  zip.file(`${root}/LICENSE.txt`, pressLicenseText(), { date: stableDate });
  zip.file(`${root}/request/request-summary.txt`, requestSummary(input.profile, input.requestId, generatedAt), { date: stableDate });
  zip.file(`${root}/README.txt`, `${siteConfig.name}\n${siteConfig.tagline}\n\nThis request-specific package contains only the materials authorized for ${input.profile.organization}. Review LICENSE.pdf and manifest.json before use. The download expires, but the included usage document does not add an expiration or legal term that is not present in the existing press-kit policy.\n`, { date: stableDate });
  zip.file(`${root}/manifest.json`, JSON.stringify(manifest, null, 2), { date: stableDate });
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, platform: "UNIX" });
  if (buffer.byteLength > MAX_AUTHORIZED_PRESS_PACKAGE_BYTES) throw new Error("Generated press package exceeds the safety limit");
  return { buffer, manifest, checksumSha256: createHash("sha256").update(buffer).digest("hex") };
}
