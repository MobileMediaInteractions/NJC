import {
  PDFDocument,
  type PDFFont,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { pressLicenseText } from "@/lib/press-kit-policy";
import { siteConfig } from "@/lib/site";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const navy = rgb(0.025, 0.122, 0.192);
const green = rgb(0.09, 0.245, 0.196);
const gold = rgb(0.769, 0.584, 0.271);
const ink = rgb(0.08, 0.095, 0.09);
const muted = rgb(0.38, 0.41, 0.4);

type LicenseInput = {
  licenseId: string;
  requestId: string;
  issuedAt: Date;
  requesterName: string;
  organization: string;
  projectName: string;
  intendedUse: string;
  whereUsed: string;
  assetTitles: string[];
  restrictions: string[];
  licenseVersion: string;
};

function clean(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of clean(value).split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function generatePressKitLicensePdf(input: LicenseInput) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const serif = await document.embedFont(StandardFonts.TimesRoman);
  const serifBold = await document.embedFont(StandardFonts.TimesRomanBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 680;

  const header = () => {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 84, width: PAGE_WIDTH, height: 84, color: navy });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 5, width: PAGE_WIDTH, height: 5, color: gold });
    page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 66, width: 44, height: 44, color: green });
    page.drawText("NJC", { x: MARGIN + 7, y: PAGE_HEIGHT - 51, size: 16, font: serifBold, color: rgb(1, 1, 1) });
    page.drawText("THE NEW JERSEY COURIER", { x: MARGIN + 57, y: PAGE_HEIGHT - 40, size: 14, font: bold, color: rgb(1, 1, 1) });
    page.drawText("PRESS & MEDIA AUTHORIZATION", { x: MARGIN + 57, y: PAGE_HEIGHT - 55, size: 7.5, font: bold, color: gold });
  };
  const footer = (current: typeof page, number: number) => {
    current.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: 0.5, color: muted });
    current.drawText(`${siteConfig.name} | ${input.licenseVersion}`, { x: MARGIN, y: 27, size: 7, font: regular, color: muted });
    const label = `Page ${number}`;
    current.drawText(label, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 7), y: 27, size: 7, font: regular, color: muted });
  };
  const ensure = (needed: number) => {
    if (y - needed > 58) return;
    footer(page, document.getPageCount());
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 5, width: PAGE_WIDTH, height: 5, color: gold });
    page.drawText("THE NEW JERSEY COURIER | PRESS AUTHORIZATION CONTINUED", { x: MARGIN, y: PAGE_HEIGHT - 29, size: 7.5, font: bold, color: navy });
    y = PAGE_HEIGHT - 55;
  };
  const text = (value: string, options: { font?: PDFFont; size?: number; lineHeight?: number; color?: ReturnType<typeof rgb>; after?: number } = {}) => {
    const font = options.font ?? serif;
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? size * 1.45;
    for (const line of wrap(value, font, size, PAGE_WIDTH - MARGIN * 2)) {
      ensure(lineHeight + 2);
      page.drawText(line, { x: MARGIN, y, size, font, color: options.color ?? ink });
      y -= lineHeight;
    }
    y -= options.after ?? 5;
  };

  header();
  text("LIMITED PRESS-KIT AUTHORIZATION", { font: bold, size: 9, color: gold, after: 12 });
  text("Request-specific media authorization", { font: serifBold, size: 23, lineHeight: 27, color: ink, after: 14 });
  text(`License ID: ${input.licenseId}\nRequest ID: ${input.requestId}\nIssued: ${input.issuedAt.toISOString()}\nRequester: ${input.requesterName}\nOrganization: ${input.organization}`, { font: regular, size: 8.5, lineHeight: 13, color: muted, after: 14 });

  text("APPROVED PURPOSE", { font: bold, size: 8, color: gold, after: 6 });
  text(`${input.projectName}\nClassification: ${input.intendedUse}\nPlacement: ${input.whereUsed}`, { after: 12 });

  text("APPROVED MATERIALS", { font: bold, size: 8, color: gold, after: 6 });
  input.assetTitles.forEach((title) => text(`- ${title}`, { size: 9.5, after: 2 }));
  y -= 7;

  text("REQUEST-SPECIFIC RESTRICTIONS", { font: bold, size: 8, color: gold, after: 6 });
  input.restrictions.forEach((restriction) => text(`- ${restriction}`, { size: 9.5, after: 2 }));
  y -= 7;

  const licenseParagraphs = pressLicenseText().split(/\n\n/).filter(Boolean);
  text(licenseParagraphs.shift() ?? "PRESS KIT LICENSE AND USAGE", { font: bold, size: 8, color: gold, after: 7 });
  licenseParagraphs.forEach((paragraph) => text(paragraph, { size: 9.5, lineHeight: 14, after: 8 }));

  text("LEGAL REVIEW NOTICE", { font: bold, size: 8, color: gold, after: 6 });
  text("The operating entity, monitored legal contact, and entity-specific governing-law terms remain pending in the project's current legal foundation. This document applies only the existing press-kit usage language and does not add legal rights or terms that the project has not approved.", { font: regular, size: 8.5, lineHeight: 13, color: muted, after: 0 });

  footer(page, document.getPageCount());
  document.setTitle(`Press-kit authorization ${input.licenseId}`);
  document.setAuthor(siteConfig.name);
  document.setSubject(`Request-specific press-kit authorization for ${input.organization}`);
  document.setCreator(`${siteConfig.name} Press & Media Portal`);
  document.setCreationDate(input.issuedAt);
  document.setModificationDate(input.issuedAt);
  return Buffer.from(await document.save());
}
