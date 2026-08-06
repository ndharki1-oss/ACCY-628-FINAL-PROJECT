import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildLeaseTemplateSections } from "./content";
import type { LeaseTemplateData } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 16;
const HEADING_SIZE = 11;
const BODY_SIZE = 10;

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildLeaseTemplatePdf(data: LeaseTemplateData) {
  const pdf = await PDFDocument.create();
  const documentTitle = "HARBORLINE COMMERCIAL MANAGEMENT LEASE";
  pdf.setTitle(documentTitle);
  pdf.setAuthor("Harborline Commercial Management");
  pdf.setSubject("Commercial Lease Agreement");

  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (
    text: string,
    options?: { bold?: boolean; size?: number; gapAfter?: number }
  ) => {
    const size = options?.size ?? BODY_SIZE;
    const useBold = options?.bold ?? false;
    ensureSpace(LINE_HEIGHT + 2);
    if (text) {
      page.drawText(text, {
        x: MARGIN,
        y,
        size,
        font: useBold ? fontBold : font,
        color: rgb(0.05, 0.08, 0.12),
        maxWidth: PAGE_WIDTH - MARGIN * 2,
      });
    }
    y -= options?.gapAfter ?? LINE_HEIGHT;
  };

  drawLine(documentTitle, {
    bold: true,
    size: TITLE_SIZE,
    gapAfter: 20,
  });

  for (const section of buildLeaseTemplateSections(data)) {
    ensureSpace(LINE_HEIGHT * 3);
    drawLine(section.heading, { bold: true, size: HEADING_SIZE, gapAfter: 10 });
    for (const paragraph of section.paragraphs) {
      if (!paragraph) {
        y -= LINE_HEIGHT;
        continue;
      }
      for (const line of wrapText(paragraph, 88)) {
        drawLine(line);
      }
      y -= 6;
    }
    y -= 8;
  }

  return pdf.save();
}
