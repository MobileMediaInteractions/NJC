import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { z } from "zod";
import { siteConfig } from "@/lib/site";

export const pressKitAssetGroups = ["logos", "publication", "editorial"] as const;
export type PressKitAssetGroup = (typeof pressKitAssetGroups)[number];

export const pressKitRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  organization: z.string().trim().min(2).max(140),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  intendedUse: z.enum(["editorial", "broadcast", "podcast", "event", "research", "other"]),
  requestDetails: z.string().trim().min(10).max(2_000),
  assetGroups: z.array(z.enum(pressKitAssetGroups)).min(1).max(3),
  acceptsTerms: z.literal(true),
  website: z.string().max(0).optional().default(""),
});

export type PressKitRequest = z.infer<typeof pressKitRequestSchema>;

type ArchiveFile = { path: string; body: Buffer | string };

const fixedAssets: Record<PressKitAssetGroup, { source: string; destination: string }[]> = {
  logos: [
    { source: "brand/v1/mark.svg", destination: "brand/logos/mark.svg" },
    { source: "brand/v1/wordmark.svg", destination: "brand/logos/wordmark.svg" },
    { source: "brand/v1/wordmark-inverse.svg", destination: "brand/logos/wordmark-inverse.svg" },
    { source: "brand/v1/app-icon.svg", destination: "brand/icons/app-icon.svg" },
    { source: "brand/v1/adaptive-foreground.svg", destination: "brand/icons/adaptive-foreground.svg" },
  ],
  publication: [],
  editorial: [
    { source: "editorial/v1/garden-state-engraving.png", destination: "editorial/garden-state-engraving.png" },
  ],
};

function hash(body: Buffer | string) {
  return createHash("sha256").update(body).digest("hex");
}

function publicationFiles(): ArchiveFile[] {
  const pressContact = process.env.PRESS_CONTACT_EMAIL?.trim() || "Press contact pending public launch";
  return [
    {
      path: "publication/fact-sheet.txt",
      body: `${siteConfig.name}\n${siteConfig.tagline}\n\nCoverage model\nA county-first digital newspaper pairing statewide public-service journalism with hyper-local reporting. The launch desk focuses on Middlesex County before expanding statewide.\n\nCore desks\n- Politics & Statehouse\n- Garden State Forum opinions and op-eds\n- Jersey Laurels reader-nominated awards\n- Polling & Public Square, including The Weekly Pulse\n- Jersey Gridiron & Court high-school sports\n\nLaunch status\nPre-launch preview identity. Publication dates, legal entity details and audience figures must be confirmed before external use.\n`,
    },
    {
      path: "publication/boilerplate.txt",
      body: `${siteConfig.name} is an independent, county-first digital newspaper serving ${siteConfig.region} and the wider Garden State. Its newsroom connects accountable statewide reporting with the municipal, school, business, sports and civic stories that shape life at home.\n`,
    },
    {
      path: "publication/press-contacts.txt",
      body: `Media contact\n${pressContact}\n\nThis launch-preview package does not establish a monitored contact unless PRESS_CONTACT_EMAIL has been configured by the publisher.\n`,
    },
    {
      path: "brand/brand-guide.txt",
      body: `THE NEW JERSEY COURIER — QUICK BRAND GUIDE\n\nPositioning\n${siteConfig.tagline}\n\nCore colors\nCourier Green: ${siteConfig.primaryColor}\nCourier Gold: ${siteConfig.accentColor}\n\nUsage\nUse the standard wordmark on light backgrounds and the inverse wordmark on dark backgrounds. Preserve clear space around the mark, do not distort proportions, recolor artwork, add effects, or combine it with another organization’s mark in a way that implies endorsement.\n`,
    },
  ];
}

function packageTerms() {
  return `PRESS KIT LICENSE AND USAGE\n\nThe files in this package may be used by news, broadcast, podcast, research and event organizations for accurate editorial identification of ${siteConfig.name}. They may not be used for merchandise, political advocacy, paid endorsements, misleading composites, or standalone redistribution.\n\nDo not alter logos except for proportional sizing. Do not use an asset in a way that implies endorsement, partnership or sponsorship. The editorial illustration is a brand atmosphere image, not documentary evidence of an event. All rights not expressly granted are reserved.\n\nThis pre-launch package contains provisional publication and legal details. Verify names, contacts, statistics and launch claims with the publisher before release.\n`;
}

function requestSummary(input: PressKitRequest, requestId: string, generatedAt: string) {
  return `PRESS KIT REQUEST\n\nRequest ID: ${requestId}\nGenerated: ${generatedAt}\nRequested by: ${input.name}\nOrganization: ${input.organization}\nEmail: ${input.email}\nIntended use: ${input.intendedUse}\nIncluded groups: ${input.assetGroups.join(", ")}\n\nWhat the requester needs\n${input.requestDetails}\n\nThis summary is included so an editor or producer can match the supplied material to the original request.\n`;
}

export async function createPressKitArchive(
  input: PressKitRequest,
  options: { requestId?: string; generatedAt?: Date } = {},
) {
  const requestId = options.requestId ?? randomUUID();
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const files: ArchiveFile[] = [
    {
      path: "README.txt",
      body: `${siteConfig.name}\n${siteConfig.tagline}\n\nThis package was assembled for ${input.organization}. Start with request/request-summary.txt, then review LICENSE-AND-USAGE.txt before publication.\n`,
    },
    { path: "request/request-summary.txt", body: requestSummary(input, requestId, generatedAt) },
    { path: "LICENSE-AND-USAGE.txt", body: packageTerms() },
  ];

  if (input.assetGroups.includes("publication")) files.push(...publicationFiles());
  if (input.assetGroups.includes("editorial")) {
    files.push({
      path: "editorial/IMAGE-NOTES.txt",
      body: "garden-state-engraving.png is a publication-brand illustration. Credit: The New Jersey Courier. It must not be represented as documentary photography or evidence of a real event.\n",
    });
  }

  for (const group of input.assetGroups) {
    for (const asset of fixedAssets[group]) {
      files.push({
        path: asset.destination,
        body: await readFile(path.join(process.cwd(), "public", "assets", asset.source)),
      });
    }
  }

  const root = "NJ-Courier-Press-Kit";
  const manifest = {
    format: "nj-courier-press-kit-v1",
    requestId,
    generatedAt,
    publication: siteConfig.name,
    organization: input.organization,
    intendedUse: input.intendedUse,
    assetGroups: input.assetGroups,
    files: files.map((file) => ({ path: `${root}/${file.path}`, bytes: Buffer.byteLength(file.body), sha256: hash(file.body) })),
  };

  const zip = new JSZip();
  const stableZipDate = new Date("1980-01-01T00:00:00.000Z");
  for (const file of files) zip.file(`${root}/${file.path}`, file.body, { date: stableZipDate });
  zip.file(`${root}/manifest.json`, JSON.stringify(manifest, null, 2), { date: stableZipDate });
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, platform: "UNIX" });

  return { buffer, requestId, generatedAt, manifest };
}
