import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import {
  pressReleaseTypeLabels,
  splitPressReleaseParagraphs,
  type PressReleaseRecord,
} from "@/lib/press-release";
import type { SiteConfiguration } from "@/lib/site-settings";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 28;
const BODY_BOTTOM = 52;

const navy = rgb(0.025, 0.122, 0.192);
const green = rgb(0.09, 0.245, 0.196);
const gold = rgb(0.769, 0.584, 0.271);
const ink = rgb(0.08, 0.095, 0.09);
const muted = rgb(0.38, 0.41, 0.4);
const paperGreen = rgb(0.94, 0.965, 0.95);
const rule = rgb(0.78, 0.81, 0.8);

type Fonts = {
  sans: PDFFont;
  sansBold: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  serifItalic: PDFFont;
};

type Writer = {
  document: PDFDocument;
  page: PDFPage;
  y: number;
  fonts: Fonts;
  publication: SiteConfiguration["publication"];
};

export async function generatePressReleasePdf(
  release: PressReleaseRecord,
  publication: SiteConfiguration["publication"],
) {
  const document = await PDFDocument.create();
  const fonts: Fonts = {
    sans: await document.embedFont(StandardFonts.Helvetica),
    sansBold: await document.embedFont(StandardFonts.HelveticaBold),
    serif: await document.embedFont(StandardFonts.TimesRoman),
    serifBold: await document.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await document.embedFont(StandardFonts.TimesRomanItalic),
  };
  const writer: Writer = {
    document,
    page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: 686,
    fonts,
    publication,
  };
  drawPageHeader(writer.page, fonts, publication);

  drawText(writer, documentLabel(release), { font: fonts.sansBold, size: 9, color: gold, after: 8 });
  drawText(writer, releaseTimingLabel(release, publication.timezone), { font: fonts.sansBold, size: 9, color: navy, after: 18 });
  drawText(writer, cleanPdfText(release.headline), { font: fonts.serifBold, size: 24, lineHeight: 27, color: ink, after: 8 });
  if (release.subheadline) {
    drawText(writer, cleanPdfText(release.subheadline), { font: fonts.serif, size: 12, lineHeight: 16, color: muted, after: 12 });
  }
  writer.page.drawLine({ start: { x: MARGIN, y: writer.y }, end: { x: PAGE_WIDTH - MARGIN, y: writer.y }, thickness: 1, color: gold });
  writer.y -= 18;

  if (release.summary) {
    drawCallout(writer, cleanPdfText(release.summary), false);
    writer.y -= 5;
  }

  const paragraphs = splitPressReleaseParagraphs(release.body);
  paragraphs.forEach((paragraph, index) => {
    const copy = index === 0
      ? `${cleanPdfText(release.location).toUpperCase()} - ${cleanPdfText(paragraph)}`
      : cleanPdfText(paragraph);
    drawText(writer, copy, { font: fonts.serif, size: 10.5, lineHeight: 15, color: ink, after: 10 });
  });

  if (release.quote) {
    writer.y -= 3;
    drawCallout(writer, `"${cleanPdfText(release.quote).replace(/^"|"$/g, "")}"\n- ${cleanPdfText(release.quoteAttribution)}`, true);
    writer.y -= 7;
  }

  if (release.keyPoints.length) {
    ensureSpace(writer, 55);
    drawSectionLabel(writer, "KEY DETAILS");
    for (const point of release.keyPoints) {
      drawText(writer, `- ${cleanPdfText(point)}`, { font: fonts.serif, size: 10.5, lineHeight: 15, indent: 10, after: 4 });
    }
    writer.y -= 5;
  }

  ensureSpace(writer, 85);
  drawSectionLabel(writer, `ABOUT ${cleanPdfText(publication.shortName).toUpperCase()}`);
  for (const paragraph of splitPressReleaseParagraphs(release.boilerplate)) {
    drawText(writer, cleanPdfText(paragraph), { font: fonts.serif, size: 9.5, lineHeight: 14, color: muted, after: 8 });
  }

  ensureSpace(writer, 100);
  writer.y -= 3;
  writer.page.drawLine({ start: { x: MARGIN, y: writer.y }, end: { x: PAGE_WIDTH - MARGIN, y: writer.y }, thickness: 0.7, color: rule });
  writer.y -= 18;
  drawSectionLabel(writer, "MEDIA CONTACT");
  const contact = [
    release.contactName,
    release.contactTitle,
    release.contactEmail,
    release.contactPhone,
    release.websiteUrl,
  ].filter(Boolean).map(cleanPdfText).join(" | ");
  drawText(writer, contact, { font: fonts.sans, size: 9, lineHeight: 13, color: muted, after: 14 });
  drawText(writer, "###", { font: fonts.sansBold, size: 10, color: gold, after: 0 });

  const pages = document.getPages();
  pages.forEach((page, index) => {
    if (release.status === "draft") drawDraftWatermark(page, fonts.sansBold);
    drawFooter(page, fonts, publication, index + 1, pages.length);
  });

  document.setTitle(cleanPdfText(release.headline));
  document.setAuthor(cleanPdfText(publication.name));
  document.setSubject(`${pressReleaseTypeLabels[release.documentType]} from ${publication.name}`);
  document.setCreator(`${publication.name} Studio`);
  document.setProducer(`${publication.name} Studio PDF engine`);
  document.setCreationDate(new Date(release.createdAt));
  document.setModificationDate(new Date(release.updatedAt));
  return document.save();
}

function drawPageHeader(page: PDFPage, fonts: Fonts, publication: SiteConfiguration["publication"]) {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 82, width: PAGE_WIDTH, height: 82, color: navy });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 5, width: PAGE_WIDTH, height: 5, color: gold });
  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 65, width: 43, height: 43, color: green });
  page.drawLine({ start: { x: MARGIN + 7, y: PAGE_HEIGHT - 30 }, end: { x: MARGIN + 36, y: PAGE_HEIGHT - 30 }, thickness: 1.5, color: gold });
  page.drawLine({ start: { x: MARGIN + 7, y: PAGE_HEIGHT - 56 }, end: { x: MARGIN + 36, y: PAGE_HEIGHT - 56 }, thickness: 1.5, color: gold });
  page.drawText("NJC", { x: MARGIN + 7.5, y: PAGE_HEIGHT - 49, size: 15, font: fonts.serifBold, color: rgb(1, 1, 1) });
  page.drawText(cleanPdfText(publication.shortName).toUpperCase(), { x: MARGIN + 55, y: PAGE_HEIGHT - 37, size: 14, font: fonts.sansBold, color: rgb(1, 1, 1) });
  page.drawText(cleanPdfText(publication.region).toUpperCase(), { x: MARGIN + 55, y: PAGE_HEIGHT - 52, size: 7, font: fonts.sansBold, color: rgb(0.72, 0.77, 0.79) });
  const mediaLabel = "MEDIA RELATIONS";
  page.drawText(mediaLabel, { x: PAGE_WIDTH - MARGIN - fonts.sansBold.widthOfTextAtSize(mediaLabel, 8), y: PAGE_HEIGHT - 43, size: 8, font: fonts.sansBold, color: gold });
}

function drawFooter(page: PDFPage, fonts: Fonts, publication: SiteConfiguration["publication"], pageNumber: number, pageCount: number) {
  page.drawLine({ start: { x: MARGIN, y: 43 }, end: { x: PAGE_WIDTH - MARGIN, y: 43 }, thickness: 0.6, color: rule });
  const left = cleanPdfText(`${publication.name} | ${publication.city}, ${publication.state}`);
  const right = `Page ${pageNumber} of ${pageCount}`;
  page.drawText(left, { x: MARGIN, y: FOOTER_Y, size: 7.5, font: fonts.sans, color: muted });
  page.drawText(right, { x: PAGE_WIDTH - MARGIN - fonts.sans.widthOfTextAtSize(right, 7.5), y: FOOTER_Y, size: 7.5, font: fonts.sans, color: muted });
}

function drawContinuationHeader(page: PDFPage, fonts: Fonts, publication: SiteConfiguration["publication"]) {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 5, width: PAGE_WIDTH, height: 5, color: gold });
  const left = cleanPdfText(publication.shortName).toUpperCase();
  const right = "MEDIA RELATIONS | CONTINUED";
  page.drawText(left, { x: MARGIN, y: PAGE_HEIGHT - 28, size: 8, font: fonts.sansBold, color: navy });
  page.drawText(right, { x: PAGE_WIDTH - MARGIN - fonts.sansBold.widthOfTextAtSize(right, 7), y: PAGE_HEIGHT - 28, size: 7, font: fonts.sansBold, color: gold });
  page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 38 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 38 }, thickness: 0.6, color: rule });
}

function drawDraftWatermark(page: PDFPage, font: PDFFont) {
  page.drawText("DRAFT", { x: 165, y: 310, size: 76, font, color: navy, opacity: 0.055, rotate: degrees(32) });
}

function documentLabel(release: PressReleaseRecord) {
  return pressReleaseTypeLabels[release.documentType].toUpperCase();
}

function releaseTimingLabel(release: PressReleaseRecord, timezone: string) {
  if (release.releaseTiming === "immediate") return "FOR IMMEDIATE RELEASE";
  const date = release.releaseAt ? new Date(release.releaseAt) : new Date();
  const formatted = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: timezone }).format(date);
  return `EMBARGOED UNTIL ${formatted.toUpperCase()} ${timezone}`;
}

function drawSectionLabel(writer: Writer, label: string) {
  drawText(writer, label, { font: writer.fonts.sansBold, size: 8, lineHeight: 10, color: gold, after: 7 });
}

function drawCallout(writer: Writer, value: string, quotation: boolean) {
  const font = quotation ? writer.fonts.serifItalic : writer.fonts.serifBold;
  const size = quotation ? 11 : 10.5;
  const lineHeight = quotation ? 16 : 15;
  const lines = wrapText(value, font, size, CONTENT_WIDTH - 36);
  const height = lines.length * lineHeight + 26;
  ensureSpace(writer, height + 5);
  writer.page.drawRectangle({ x: MARGIN, y: writer.y - height + 8, width: CONTENT_WIDTH, height, color: paperGreen });
  writer.page.drawRectangle({ x: MARGIN, y: writer.y - height + 8, width: 4, height, color: gold });
  let lineY = writer.y - 10;
  for (const line of lines) {
    writer.page.drawText(line, { x: MARGIN + 18, y: lineY, size, font, color: quotation ? ink : green });
    lineY -= lineHeight;
  }
  writer.y -= height + 4;
}

function drawText(
  writer: Writer,
  value: string,
  options: {
    font: PDFFont;
    size: number;
    lineHeight?: number;
    color?: ReturnType<typeof rgb>;
    indent?: number;
    after?: number;
  },
) {
  const lineHeight = options.lineHeight ?? options.size * 1.25;
  const indent = options.indent ?? 0;
  const lines = wrapText(value, options.font, options.size, CONTENT_WIDTH - indent);
  for (const line of lines) {
    ensureSpace(writer, lineHeight);
    writer.page.drawText(line, {
      x: MARGIN + indent,
      y: writer.y,
      size: options.size,
      font: options.font,
      color: options.color ?? ink,
    });
    writer.y -= lineHeight;
  }
  writer.y -= options.after ?? 0;
}

function ensureSpace(writer: Writer, needed: number) {
  if (writer.y - needed >= BODY_BOTTOM) return;
  writer.page = writer.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawContinuationHeader(writer.page, writer.fonts, writer.publication);
  writer.y = 736;
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const output: string[] = [];
  for (const paragraph of value.split("\n")) {
    if (!paragraph) {
      output.push("");
      continue;
    }
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const pieces = splitLongWord(word, font, size, maxWidth);
      for (const piece of pieces) {
        const candidate = line ? `${line} ${piece}` : piece;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
        else {
          if (line) output.push(line);
          line = piece;
        }
      }
    }
    if (line) output.push(line);
  }
  return output.length ? output : [""];
}

function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    if (piece && font.widthOfTextAtSize(piece + character, size) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else piece += character;
  }
  if (piece) pieces.push(piece);
  return pieces;
}

export function cleanPdfText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}
