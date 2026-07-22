import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { generatePressReleasePdf } from "../src/lib/press-release-pdf";
import { pressReleaseFilename, pressReleaseInput, type PressReleaseRecord } from "../src/lib/press-release";
import { defaultSiteConfiguration } from "../src/lib/site-settings";

const validInput = {
  documentType: "press_release" as const,
  status: "ready" as const,
  headline: "Courier Announces Expanded Public-Service Reporting Across Middlesex County",
  subheadline: "The newsroom will add municipal, education and high-school sports coverage.",
  summary: "The expansion strengthens county-first reporting and creates additional ways for residents to reach the newsroom.",
  location: "New Brunswick",
  releaseTiming: "immediate" as const,
  releaseAt: "",
  body: "The New Jersey Courier today announced an expansion of its public-service reporting across Middlesex County. The initiative will focus on municipal government, schools and community life.\n\nThe newsroom will publish reporting throughout the week and maintain direct ways for residents to share documents, questions and news tips.",
  quote: "Local reporting works best when the newsroom is accessible to the people it serves.",
  quoteAttribution: "The New Jersey Courier newsroom",
  keyPoints: ["County-first reporting", "Direct community tip channels"],
  boilerplate: "The New Jersey Courier is an independent, county-first digital newspaper serving Middlesex County and the Garden State.",
  contactName: "Media Relations",
  contactTitle: "Newsroom",
  contactEmail: "press@example.com",
  contactPhone: "732-555-0100",
  websiteUrl: "https://njc-web.vercel.app",
  internalNotes: "Approved test fixture.",
};

test("press-release validation requires an embargo date and attributed quotations", () => {
  const missingEmbargo = pressReleaseInput.safeParse({ ...validInput, releaseTiming: "embargoed", releaseAt: "" });
  assert.equal(missingEmbargo.success, false);
  if (!missingEmbargo.success) assert.equal(missingEmbargo.error.flatten().fieldErrors.releaseAt?.[0], "An embargo date and time is required");

  const missingAttribution = pressReleaseInput.safeParse({ ...validInput, quoteAttribution: "" });
  assert.equal(missingAttribution.success, false);
  if (!missingAttribution.success) assert.equal(missingAttribution.error.flatten().fieldErrors.quoteAttribution?.[0], "Add the quote attribution");
});

test("press-release filenames are stable, dated and safe for downloads", () => {
  assert.equal(pressReleaseFilename("New parks & schools: What changes?", new Date("2026-07-22T12:00:00Z")), "2026-07-22-new-parks-schools-what-changes.pdf");
});

test("PDF generation creates a readable multi-page newsroom document", async () => {
  const parsed = pressReleaseInput.parse({ ...validInput, body: Array.from({ length: 45 }, (_, index) => `Paragraph ${index + 1} explains a verified part of the announcement with enough copy to exercise safe page wrapping and page transitions.`).join("\n\n") });
  const record: PressReleaseRecord = { ...parsed, id: "11111111-1111-4111-8111-111111111111", createdByClerkId: "user_test", updatedByClerkId: "user_test", lastExportedAt: null, exportCount: 0, createdAt: "2026-07-22T12:00:00.000Z", updatedAt: "2026-07-22T12:00:00.000Z" };
  const bytes = await generatePressReleasePdf(record, defaultSiteConfiguration.publication);
  assert.ok(bytes.byteLength > 5_000);
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 2);
  assert.equal(document.getTitle(), record.headline);
  assert.equal(document.getAuthor(), defaultSiteConfiguration.publication.name);
});
