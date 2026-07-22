import { z } from "zod";

export const pressReleaseDocumentTypes = [
  "press_release",
  "media_advisory",
  "official_statement",
] as const;

export const pressReleaseStatuses = ["draft", "ready", "archived"] as const;
export const pressReleaseTimings = ["immediate", "embargoed"] as const;

export const pressReleaseInput = z.object({
  documentType: z.enum(pressReleaseDocumentTypes),
  status: z.enum(pressReleaseStatuses),
  headline: z.string().trim().min(5, "Write a specific headline").max(240),
  subheadline: z.string().trim().max(320).default(""),
  summary: z.string().trim().max(1_000).default(""),
  location: z.string().trim().min(2, "Add a release dateline").max(120),
  releaseTiming: z.enum(pressReleaseTimings),
  releaseAt: z.string().trim().default("").refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    "Choose a valid embargo date and time",
  ),
  body: z.string().trim().min(20, "Add the press release body").max(50_000),
  quote: z.string().trim().max(2_000).default(""),
  quoteAttribution: z.string().trim().max(200).default(""),
  keyPoints: z.array(z.string().trim().min(1).max(400)).max(12).default([]),
  boilerplate: z.string().trim().min(20, "Add an organization boilerplate").max(8_000),
  contactName: z.string().trim().min(2, "Add a media contact").max(120),
  contactTitle: z.string().trim().max(120).default(""),
  contactEmail: z.string().trim().email("Enter a valid media contact email").max(254),
  contactPhone: z.string().trim().max(60).default(""),
  websiteUrl: z.string().trim().url("Enter a complete website URL").max(500),
  internalNotes: z.string().trim().max(4_000).default(""),
}).superRefine((value, context) => {
  if (value.releaseTiming === "embargoed" && !value.releaseAt) {
    context.addIssue({ code: "custom", path: ["releaseAt"], message: "An embargo date and time is required" });
  }
  if (value.quote && !value.quoteAttribution) {
    context.addIssue({ code: "custom", path: ["quoteAttribution"], message: "Add the quote attribution" });
  }
  if (!value.quote && value.quoteAttribution) {
    context.addIssue({ code: "custom", path: ["quote"], message: "Add the quotation or remove its attribution" });
  }
});

export type PressReleaseInput = z.infer<typeof pressReleaseInput>;
export type PressReleaseDocumentType = PressReleaseInput["documentType"];
export type PressReleaseStatus = PressReleaseInput["status"];

export type PressReleaseRecord = PressReleaseInput & {
  id: string;
  createdByClerkId: string;
  updatedByClerkId: string;
  lastExportedAt: Date | string | null;
  exportCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export const pressReleaseTypeLabels: Record<PressReleaseDocumentType, string> = {
  press_release: "Press release",
  media_advisory: "Media advisory",
  official_statement: "Official statement",
};

export function splitPressReleaseParagraphs(value: string) {
  return value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function parsePressReleaseKeyPoints(value: string) {
  return value.split("\n").map((line) => line.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
}

export function pressReleaseFilename(headline: string, date = new Date()) {
  const slug = headline.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "press-release";
  return `${date.toISOString().slice(0, 10)}-${slug}.pdf`;
}
