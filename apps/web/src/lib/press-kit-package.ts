import "server-only";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import {
  pressKitPackages,
  pressKitRequests,
} from "@harborline/backend/schema";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import { buildAuthorizedPressArchive } from "@/lib/press-kit-archive";
import { generatePressKitLicensePdf } from "@/lib/press-kit-license-pdf";
import {
  PRESS_LICENSE_VERSION,
  type PressPolicyDecision,
  type PressRequestProfile,
} from "@/lib/press-kit-policy";
import {
  checksumPressAsset,
  getPressAssetsByIds,
  issuePressAccessToken,
  pressAssetDestination,
  readPressAsset,
} from "@/lib/press-kit-server";
const PACKAGE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export async function generateAuthorizedPressPackage(input: {
  requestId: string;
  profile: PressRequestProfile;
  decision: PressPolicyDecision;
  createdByClerkId?: string | null;
}) {
  if (!input.decision.licenseType || !input.decision.approvedAssetIds.length) {
    throw new Error("An approved asset decision is required before package generation");
  }
  const privateToken = getPrivateBlobToken();
  if (!privateToken) throw new Error("Private Blob storage is required for press packages");

  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PACKAGE_LIFETIME_MS);
  const licenseId = randomUUID();
  const packageId = randomUUID();
  const download = issuePressAccessToken();
  const assets = await getPressAssetsByIds(input.decision.approvedAssetIds);
  const approvedSet = new Set(input.decision.approvedAssetIds);
  if (assets.length !== approvedSet.size || assets.some((asset) => !approvedSet.has(asset.id))) {
    throw new Error("The approved press asset set is incomplete");
  }

  const [storedPackage] = await db.insert(pressKitPackages).values({
    id: packageId,
    requestId: input.requestId,
    licenseId,
    licenseVersion: PRESS_LICENSE_VERSION,
    status: "generating",
    downloadTokenHash: download.tokenHash,
    expiresAt,
    createdByClerkId: input.createdByClerkId ?? null,
  }).onConflictDoUpdate({
    target: pressKitPackages.requestId,
    set: {
      licenseId,
      licenseVersion: PRESS_LICENSE_VERSION,
      status: "generating",
      pathname: null,
      filename: null,
      size: null,
      checksumSha256: null,
      manifest: {},
      downloadTokenHash: download.tokenHash,
      expiresAt,
      revokedAt: null,
      failureCode: null,
      createdByClerkId: input.createdByClerkId ?? null,
      updatedAt: now,
    },
  }).returning({ id: pressKitPackages.id });
  const storedPackageId = storedPackage.id;
  await db.update(pressKitRequests).set({
    status: "package_generating",
    updatedAt: now,
  }).where(eq(pressKitRequests.id, input.requestId));

  try {
    const prepared = await Promise.all(assets.map(async (asset) => {
      const body = await readPressAsset(asset);
      return {
        asset,
        body,
        destination: pressAssetDestination(asset),
        sha256: await checksumPressAsset(asset, body),
      };
    }));
    const licensePdf = await generatePressKitLicensePdf({
      licenseId,
      requestId: input.requestId,
      issuedAt: now,
      requesterName: input.profile.name,
      organization: input.profile.organization,
      projectName: input.profile.projectName,
      intendedUse: input.profile.usageClassification,
      whereUsed: input.profile.whereUsed,
      assetTitles: prepared.map((item) => item.asset.title),
      restrictions: input.decision.restrictions,
      licenseVersion: PRESS_LICENSE_VERSION,
    });
    const archive = await buildAuthorizedPressArchive({
      requestId: input.requestId,
      licenseId,
      generatedAt: now,
      expiresAt,
      profile: input.profile,
      decision: input.decision,
      licensePdf,
      assets: prepared,
    });
    const { buffer, manifest, checksumSha256 } = archive;

    const filename = `njc-press-kit-${input.requestId.slice(0, 8)}.zip`;
    const blob = await put(`press-kits/${input.requestId}/${storedPackageId}.zip`, buffer, {
      access: "private",
      token: privateToken,
      addRandomSuffix: false,
      contentType: "application/zip",
    });
    await db.update(pressKitPackages).set({
      status: "ready",
      pathname: blob.pathname,
      filename,
      size: buffer.byteLength,
      checksumSha256,
      manifest,
      updatedAt: new Date(),
    }).where(eq(pressKitPackages.requestId, input.requestId));
    await db.update(pressKitRequests).set({
      status: "ready",
      archiveBytes: buffer.byteLength,
      generatedAt: now,
      updatedAt: new Date(),
    }).where(eq(pressKitRequests.id, input.requestId));
    return {
      packageId: storedPackageId,
      downloadToken: download.token,
      expiresAt: expiresAt.toISOString(),
      filename,
      checksumSha256,
      manifest,
    };
  } catch (error) {
    await db.update(pressKitPackages).set({
      status: "failed",
      failureCode: "package_generation_failed",
      updatedAt: new Date(),
    }).where(eq(pressKitPackages.requestId, input.requestId));
    await db.update(pressKitRequests).set({
      status: "manual_review",
      decisionReasons: ["The approved package could not be generated and requires staff review."],
      updatedAt: new Date(),
    }).where(eq(pressKitRequests.id, input.requestId));
    throw error;
  }
}
