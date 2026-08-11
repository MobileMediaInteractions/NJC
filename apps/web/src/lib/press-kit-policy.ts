import { z } from "zod";
import { siteConfig } from "@/lib/site";

export const PRESS_POLICY_VERSION = "njc-press-media-v1";
export const PRESS_LICENSE_VERSION = "njc-press-identification-v1";

export const pressUsageClassifications = [
  "editorial",
  "broadcast",
  "podcast",
  "review",
  "research",
  "educational",
  "event",
  "promotional",
  "commercial",
  "political_advocacy",
  "paid_endorsement",
  "merchandising",
  "standalone_redistribution",
  "misleading_or_deceptive",
  "unknown",
] as const;

export type PressUsageClassification =
  (typeof pressUsageClassifications)[number];

export const pressRequestStatuses = [
  "generated",
  "draft",
  "intake",
  "needs_information",
  "evaluating",
  "approved",
  "partially_approved",
  "manual_review",
  "denied",
  "package_generating",
  "ready",
  "downloaded",
  "expired",
  "revoked",
] as const;

export const pressDecisionStates = [
  "approved",
  "partially_approved",
  "needs_information",
  "not_permitted",
  "manual_review",
] as const;

export type PressDecisionState = (typeof pressDecisionStates)[number];

export type BuiltInPressAsset = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "logos" | "icons" | "images" | "documents";
  sourceKind: "bundled_public" | "generated_document";
  sourcePath: string;
  mimeType: string;
  version: string;
  visibility: "public";
  approvedUsageTypes: PressUsageClassification[];
  restrictions: string[];
  attribution: string | null;
  active: true;
  metadata: Record<string, unknown>;
};

const standardUses: PressUsageClassification[] = [
  "editorial",
  "broadcast",
  "podcast",
  "review",
  "research",
  "educational",
  "event",
];

const logoRestrictions = [
  "Keep the original proportions.",
  "Do not recolor, add effects, or combine the mark in a way that implies endorsement, partnership, or sponsorship.",
  "Do not use for merchandise, political advocacy, paid endorsement, misleading alteration, or standalone redistribution.",
];

export const builtInPressAssets: BuiltInPressAsset[] = [
  {
    id: "c0010000-0000-4000-8000-000000000001",
    slug: "njc-mark-svg",
    title: "NJC mark — SVG",
    description: "Compact NJC publication mark for approved editorial identification.",
    category: "logos",
    sourceKind: "bundled_public",
    sourcePath: "brand/v1/mark.svg",
    mimeType: "image/svg+xml",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: logoRestrictions,
    attribution: null,
    active: true,
    metadata: { destination: "Logos/njc-mark.svg", keywords: ["logo", "mark", "seal", "svg", "transparent"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000002",
    slug: "njc-wordmark-svg",
    title: "NJ Courier wordmark — SVG",
    description: "Primary wordmark for light backgrounds.",
    category: "logos",
    sourceKind: "bundled_public",
    sourcePath: "brand/v1/wordmark.svg",
    mimeType: "image/svg+xml",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: logoRestrictions,
    attribution: null,
    active: true,
    metadata: { destination: "Logos/nj-courier-wordmark.svg", keywords: ["logo", "wordmark", "svg", "transparent", "light background"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000003",
    slug: "njc-wordmark-inverse-svg",
    title: "NJ Courier inverse wordmark — SVG",
    description: "Approved inverse wordmark for dark backgrounds.",
    category: "logos",
    sourceKind: "bundled_public",
    sourcePath: "brand/v1/wordmark-inverse.svg",
    mimeType: "image/svg+xml",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: logoRestrictions,
    attribution: null,
    active: true,
    metadata: { destination: "Logos/nj-courier-wordmark-inverse.svg", keywords: ["logo", "wordmark", "inverse", "dark background", "transparent"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000004",
    slug: "njc-app-icon-svg",
    title: "NJC app icon — SVG",
    description: "Vector application icon for approved product identification.",
    category: "icons",
    sourceKind: "bundled_public",
    sourcePath: "brand/v1/app-icon.svg",
    mimeType: "image/svg+xml",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: logoRestrictions,
    attribution: null,
    active: true,
    metadata: { destination: "Icons/njc-app-icon.svg", keywords: ["app", "icon", "svg", "product"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000005",
    slug: "garden-state-engraving",
    title: "Garden State engraving",
    description: "High-resolution publication-brand illustration with a non-documentary-use restriction.",
    category: "images",
    sourceKind: "bundled_public",
    sourcePath: "editorial/v1/garden-state-engraving.png",
    mimeType: "image/png",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: [
      "Credit: The New Jersey Courier.",
      "This is a brand illustration and must not be presented as documentary photography or evidence of a real event.",
      "Do not use for merchandise, political advocacy, paid endorsement, misleading alteration, or standalone redistribution.",
    ],
    attribution: "The New Jersey Courier",
    active: true,
    metadata: { destination: "Images/garden-state-engraving.png", keywords: ["illustration", "new jersey", "key art", "editorial", "image"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000006",
    slug: "publication-fact-sheet",
    title: "Publication fact sheet",
    description: "Current publication positioning, coverage model, desks, and launch-status notice.",
    category: "documents",
    sourceKind: "generated_document",
    sourcePath: "publication-fact-sheet",
    mimeType: "text/plain",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: ["Publication dates, legal entity details, and audience figures must be confirmed by the publisher before external use."],
    attribution: null,
    active: true,
    metadata: { destination: "Documents/fact-sheet.txt", keywords: ["fact sheet", "facts", "background", "technical information"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000007",
    slug: "publication-boilerplate",
    title: "Publication boilerplate",
    description: "Approved short description of The New Jersey Courier.",
    category: "documents",
    sourceKind: "generated_document",
    sourcePath: "publication-boilerplate",
    mimeType: "text/plain",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: ["Use accurately and do not alter it in a way that implies sponsorship or endorsement."],
    attribution: null,
    active: true,
    metadata: { destination: "Documents/boilerplate.txt", keywords: ["boilerplate", "description", "company description", "publication description"] },
  },
  {
    id: "c0010000-0000-4000-8000-000000000008",
    slug: "quick-brand-guide",
    title: "Quick brand guide",
    description: "Current colors, positioning, and logo-use requirements.",
    category: "documents",
    sourceKind: "generated_document",
    sourcePath: "quick-brand-guide",
    mimeType: "text/plain",
    version: "1",
    visibility: "public",
    approvedUsageTypes: standardUses,
    restrictions: logoRestrictions,
    attribution: null,
    active: true,
    metadata: { destination: "Documents/quick-brand-guide.txt", keywords: ["brand guide", "colors", "logo rules", "guidelines"] },
  },
];

export const pressRequestProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  organization: z.string().trim().min(2).max(180),
  requesterRole: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  requesterWebsite: z.union([z.url().max(500), z.literal("")]).default(""),
  organizationWebsite: z.union([z.url().max(500), z.literal("")]).default(""),
  country: z.string().trim().min(2).max(100),
  projectName: z.string().trim().min(2).max(240),
  requestDetails: z.string().trim().min(20).max(5_000),
  whereUsed: z.string().trim().min(5).max(1_000),
  expectedReleaseAt: z.union([
    z.iso.datetime({ offset: true }),
    z.literal(""),
  ]).default(""),
  usageClassification: z.enum(pressUsageClassifications),
  requestedAssetIds: z.array(z.uuid()).max(50),
  unmatchedMaterials: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
});

export type PressRequestProfile = z.infer<typeof pressRequestProfileSchema>;

export function detectPressIntakeConcerns(message: string) {
  const concerns: string[] = [];
  if (/(ignore|override|bypass|disregard).{0,50}(rules?|policy|authorization|instructions?)|give me (all|every).{0,30}(private|restricted)|system prompt|developer message/i.test(message)) concerns.push("prompt_injection");
  if (/private asset|internal file|unreleased|confidential/i.test(message)) concerns.push("private_asset_request");
  return concerns;
}

export type PressPolicyAsset = {
  id: string;
  title: string;
  visibility: string;
  approvedUsageTypes: PressUsageClassification[];
  restrictions: string[];
  active: boolean;
};

export type PressPolicyDecision = {
  state: PressDecisionState;
  approvedAssetIds: string[];
  rejectedAssetIds: string[];
  reasons: string[];
  restrictions: string[];
  missingInformation: string[];
  manualReviewRequired: boolean;
  licenseType: typeof PRESS_LICENSE_VERSION | null;
};

const prohibitedUses = new Set<PressUsageClassification>([
  "political_advocacy",
  "paid_endorsement",
  "merchandising",
  "standalone_redistribution",
  "misleading_or_deceptive",
]);

const manualUses = new Set<PressUsageClassification>([
  "promotional",
  "commercial",
  "unknown",
]);

export function evaluatePressPolicy(
  input: Partial<PressRequestProfile>,
  assets: PressPolicyAsset[],
): PressPolicyDecision {
  const missingInformation: string[] = [];
  const required: Array<[keyof PressRequestProfile, string]> = [
    ["name", "requester name"],
    ["organization", "organization or publication"],
    ["requesterRole", "professional role"],
    ["email", "work email"],
    ["country", "country or jurisdiction"],
    ["projectName", "project, publication, or event"],
    ["requestDetails", "intended use"],
    ["whereUsed", "where the materials will appear"],
    ["usageClassification", "usage classification"],
  ];
  for (const [key, label] of required) {
    if (!input[key] || String(input[key]).trim().length === 0 || input[key] === "unknown") {
      missingInformation.push(label);
    }
  }
  if (!input.requestedAssetIds?.length && !input.unmatchedMaterials?.length) {
    missingInformation.push("requested materials");
  }
  if (missingInformation.length) {
    return {
      state: "needs_information",
      approvedAssetIds: [],
      rejectedAssetIds: [],
      reasons: ["The request cannot be evaluated until the required information is confirmed."],
      restrictions: [],
      missingInformation,
      manualReviewRequired: false,
      licenseType: null,
    };
  }

  const classification = input.usageClassification!;
  if (prohibitedUses.has(classification)) {
    return {
      state: "not_permitted",
      approvedAssetIds: [],
      rejectedAssetIds: input.requestedAssetIds ?? [],
      reasons: ["The requested use falls outside the existing press-kit license."],
      restrictions: [],
      missingInformation: [],
      manualReviewRequired: false,
      licenseType: null,
    };
  }
  if (manualUses.has(classification)) {
    return {
      state: "manual_review",
      approvedAssetIds: [],
      rejectedAssetIds: [],
      reasons: ["The existing press-kit rules do not authorize this use automatically."],
      restrictions: [],
      missingInformation: [],
      manualReviewRequired: true,
      licenseType: null,
    };
  }

  const requested = new Set(input.requestedAssetIds ?? []);
  const approvedAssetIds: string[] = [];
  const rejectedAssetIds: string[] = [];
  const restrictions = new Set<string>();
  let restrictedAsset = false;
  for (const asset of assets.filter((item) => requested.has(item.id))) {
    if (!asset.active || asset.visibility !== "public") {
      restrictedAsset = true;
      continue;
    }
    if (!asset.approvedUsageTypes.includes(classification)) {
      rejectedAssetIds.push(asset.id);
      continue;
    }
    approvedAssetIds.push(asset.id);
    asset.restrictions.forEach((restriction) => restrictions.add(restriction));
  }
  const knownIds = new Set(assets.map((asset) => asset.id));
  for (const id of requested) if (!knownIds.has(id)) rejectedAssetIds.push(id);

  if (restrictedAsset) {
    return {
      state: "manual_review",
      approvedAssetIds: [],
      rejectedAssetIds: [],
      reasons: ["One or more requested materials require a staff authorization decision."],
      restrictions: [...restrictions],
      missingInformation: [],
      manualReviewRequired: true,
      licenseType: null,
    };
  }
  if (!approvedAssetIds.length) {
    return {
      state: input.unmatchedMaterials?.length ? "needs_information" : "not_permitted",
      approvedAssetIds: [],
      rejectedAssetIds,
      reasons: [input.unmatchedMaterials?.length
        ? "The requested materials could not be matched to the available press catalog."
        : "None of the requested assets are available for this use."],
      restrictions: [],
      missingInformation: input.unmatchedMaterials?.length ? ["an available replacement for the unmatched materials"] : [],
      manualReviewRequired: false,
      licenseType: null,
    };
  }
  const partial = rejectedAssetIds.length > 0 || Boolean(input.unmatchedMaterials?.length);
  return {
    state: partial ? "partially_approved" : "approved",
    approvedAssetIds,
    rejectedAssetIds,
    reasons: partial
      ? ["Available materials were approved; unavailable or unauthorized items were excluded."]
      : ["The request fits the existing limited press-kit usage rules."],
    restrictions: [...restrictions],
    missingInformation: [],
    manualReviewRequired: false,
    licenseType: PRESS_LICENSE_VERSION,
  };
}

export function pressLicenseText() {
  return `PRESS KIT LICENSE AND USAGE\n\nThe files in this package may be used by news, broadcast, podcast, research and event organizations for accurate editorial identification of ${siteConfig.name}. They may not be used for merchandise, political advocacy, paid endorsements, misleading composites, or standalone redistribution.\n\nDo not alter logos except for proportional sizing. Do not use an asset in a way that implies endorsement, partnership or sponsorship. The editorial illustration is a brand atmosphere image, not documentary evidence of an event. All rights not expressly granted are reserved.\n\nVerify names, contacts, statistics, publication status and legal details with the publisher before release.\n`;
}

export function generatedPressDocument(key: string) {
  const pressContact = process.env.PRESS_CONTACT_EMAIL?.trim() || "Press contact has not been configured";
  if (key === "publication-fact-sheet") {
    return `${siteConfig.name}\n${siteConfig.tagline}\n\nCoverage model\nA county-first digital newspaper pairing statewide public-service journalism with hyper-local reporting. The launch desk focuses on Middlesex County before expanding statewide.\n\nCore desks\n- Politics & Statehouse\n- Garden State Forum opinions and op-eds\n- Jersey Laurels reader-nominated awards\n- Polling & Public Square, including The Weekly Pulse\n- Jersey Gridiron & Court high-school sports\n\nPublication status\n${siteConfig.launchStatus}. Publication dates, legal entity details and audience figures must be confirmed by the publisher before external use.\n`;
  }
  if (key === "publication-boilerplate") {
    return `${siteConfig.name} is an independent, county-first digital newspaper serving ${siteConfig.region} and the wider Garden State. Its newsroom connects accountable statewide reporting with the municipal, school, business, sports and civic stories that shape life at home.\n`;
  }
  if (key === "quick-brand-guide") {
    return `THE NEW JERSEY COURIER — QUICK BRAND GUIDE\n\nPositioning\n${siteConfig.tagline}\n\nCore colors\nCourier Green: ${siteConfig.primaryColor}\nCourier Gold: ${siteConfig.accentColor}\n\nUsage\nUse the standard wordmark on light backgrounds and the inverse wordmark on dark backgrounds. Preserve clear space around the mark, do not distort proportions, recolor artwork, add effects, or combine it with another organization’s mark in a way that implies endorsement.\n\nMedia contact\n${pressContact}\n`;
  }
  throw new Error("Unsupported generated press document");
}
