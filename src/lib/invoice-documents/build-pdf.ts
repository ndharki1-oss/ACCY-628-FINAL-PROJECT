import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { buildInvoiceDocumentSections } from "./content";
import type { InvoiceDocumentData } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const TITLE_SIZE = 18;
const HEADING_SIZE = 11;
const BODY_SIZE = 10;
const AMOUNT_COL_WIDTH = 78;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const DESC_WIDTH = CONTENT_WIDTH - AMOUNT_COL_WIDTH - 12;

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
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
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

export async function buildInvoiceDocumentPdf(data: InvoiceDocumentData) {
  const pdf = await PDFDocument.create();
  const documentTitle = `${data.invoiceNumber} Invoice`;
  pdf.setTitle(documentTitle);
  pdf.setAuthor("Harborline Commercial Management");
  pdf.setSubject("Tenant Invoice");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sections = buildInvoiceDocumentSections(data);

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
      maxWidth?: number;
    }
  ) => {
    const size = options?.size ?? BODY_SIZE;
    const useFont = options?.bold ? fontBold : font;
    const maxWidth = options?.maxWidth ?? CONTENT_WIDTH;
    const lines = wrapTextToWidth(text, useFont, size, maxWidth);
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

  drawWrapped("HARBORLINE COMMERCIAL MANAGEMENT", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 4,
  });
  drawWrapped(sections.title, {
    bold: true,
    size: TITLE_SIZE,
    paragraphGap: 10,
  });

  for (const line of sections.from) {
    drawWrapped(line, { size: BODY_SIZE });
  }
  y -= 8;

  for (const line of sections.meta) {
    drawWrapped(line, { size: BODY_SIZE });
  }
  y -= 10;

  drawWrapped("Bill To", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 4,
  });
  for (const line of sections.billTo.split("\n")) {
    drawWrapped(line, { size: BODY_SIZE });
  }
  y -= 8;

  drawWrapped("Property", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 4,
  });
  for (const line of sections.property.split("\n")) {
    drawWrapped(line, { size: BODY_SIZE });
  }
  y -= 10;

  drawWrapped("Line Items", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 6,
  });
  ensureSpace(8);
  page.drawLine({
    start: { x: MARGIN, y: y + 2 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 2 },
    thickness: 0.75,
    color: rgb(0.75, 0.78, 0.82),
  });
  y -= 8;

  const bodySpacing = lineGap(BODY_SIZE);
  for (const line of sections.lines) {
    const descLines = wrapTextToWidth(
      line.description,
      font,
      BODY_SIZE,
      DESC_WIDTH
    );
    const rowHeight = Math.max(descLines.length, 1) * bodySpacing + 4;
    ensureSpace(rowHeight);

    const rowTop = y;
    descLines.forEach((part, idx) => {
      page.drawText(part, {
        x: MARGIN,
        y: rowTop - idx * bodySpacing,
        size: BODY_SIZE,
        font,
        color: rgb(0.05, 0.08, 0.12),
      });
    });

    const amountWidth = fontBold.widthOfTextAtSize(line.amountLabel, BODY_SIZE);
    page.drawText(line.amountLabel, {
      x: PAGE_WIDTH - MARGIN - amountWidth,
      y: rowTop,
      size: BODY_SIZE,
      font: fontBold,
      color: rgb(0.05, 0.08, 0.12),
    });

    y = rowTop - rowHeight;
  }

  ensureSpace(12);
  page.drawLine({
    start: { x: MARGIN, y: y + 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
    thickness: 0.75,
    color: rgb(0.75, 0.78, 0.82),
  });
  y -= 10;

  for (const line of sections.totals) {
    const size = BODY_SIZE;
    const spacing = lineGap(size);
    ensureSpace(spacing);
    const width = fontBold.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: PAGE_WIDTH - MARGIN - width,
      y,
      size,
      font: fontBold,
      color: rgb(0.05, 0.08, 0.12),
    });
    y -= spacing + 4;
  }

  if (sections.disputeReason) {
    y -= 4;
    drawWrapped("Dispute", {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 4,
    });
    drawWrapped(sections.disputeReason, { size: BODY_SIZE, paragraphGap: 6 });
  }

  y -= 10;
  drawWrapped(sections.footer, { size: 9 });

  return pdf.save();
}
