import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { buildManagementAgreementSections } from "./content";
import type { ManagementAgreementTemplateData } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const TITLE_SIZE = 15;
const HEADING_SIZE = 11;
const BODY_SIZE = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapTextToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (font.widthOfTextAtSize(next, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = next;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildManagementAgreementPdf(
  data: ManagementAgreementTemplateData
) {
  const pdf = await PDFDocument.create();
  const documentTitle = "HARBORLINE COMMERCIAL PROPERTY MANAGEMENT AGREEMENT";
  pdf.setTitle(documentTitle);
  pdf.setAuthor("Harborline Commercial Management");
  pdf.setSubject("Commercial Property Management Agreement");

  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const lineGap = (size: number) => size + 4;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawWrapped = (
    text: string,
    options?: {
      bold?: boolean;
      size?: number;
      paragraphGap?: number;
    }
  ) => {
    const size = options?.size ?? BODY_SIZE;
    const useFont = options?.bold ? fontBold : font;
    const lines = wrapTextToWidth(text, useFont, size, CONTENT_WIDTH);
    const spacing = lineGap(size);

    for (const line of lines) {
      ensureSpace(spacing);
      if (line) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size,
          font: useFont,
          color: rgb(0.05, 0.08, 0.12),
        });
      }
      y -= spacing;
    }
    if (options?.paragraphGap) y -= options.paragraphGap;
  };

  drawWrapped(documentTitle, {
    bold: true,
    size: TITLE_SIZE,
    paragraphGap: 12,
  });

  for (const section of buildManagementAgreementSections(data)) {
    ensureSpace(lineGap(HEADING_SIZE) * 2);
    drawWrapped(section.heading, {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 6,
    });
    for (const paragraph of section.paragraphs) {
      if (!paragraph) {
        y -= lineGap(BODY_SIZE);
        continue;
      }
      drawWrapped(paragraph, { size: BODY_SIZE, paragraphGap: 6 });
    }
    y -= 6;
  }

  return pdf.save();
}
