import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import {
  formatStatementDisplayDate,
  formatStatementMoney,
  type OwnerStatementDocumentData,
} from "./types";

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

export async function buildOwnerStatementPdf(data: OwnerStatementDocumentData) {
  const pdf = await PDFDocument.create();
  const documentTitle = `${data.statementNumber} Owner Statement`;
  pdf.setTitle(documentTitle);
  pdf.setAuthor("Harborline Commercial Management");
  pdf.setSubject("Owner Statement and Remittance");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

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

  const drawAmountRow = (label: string, amount: number, bold = false) => {
    const spacing = lineGap(BODY_SIZE);
    ensureSpace(spacing);
    const useFont = bold ? fontBold : font;
    const amountLabel = formatStatementMoney(amount);
    page.drawText(label, {
      x: MARGIN,
      y,
      size: BODY_SIZE,
      font: useFont,
      color: rgb(0.05, 0.08, 0.12),
    });
    const amountWidth = fontBold.widthOfTextAtSize(amountLabel, BODY_SIZE);
    page.drawText(amountLabel, {
      x: PAGE_WIDTH - MARGIN - amountWidth,
      y,
      size: BODY_SIZE,
      font: fontBold,
      color: rgb(0.05, 0.08, 0.12),
    });
    y -= spacing + 2;
  };

  drawWrapped("HARBORLINE COMMERCIAL MANAGEMENT", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 4,
  });
  drawWrapped("Owner Statement", {
    bold: true,
    size: TITLE_SIZE,
    paragraphGap: 10,
  });

  drawWrapped(`Statement: ${data.statementNumber}`);
  drawWrapped(`Status: ${data.status.replaceAll("_", " ")}`);
  drawWrapped(
    `Period: ${formatStatementDisplayDate(data.periodStart)} – ${formatStatementDisplayDate(data.periodEnd)}`
  );
  y -= 8;

  drawWrapped("Owner", { bold: true, size: HEADING_SIZE, paragraphGap: 4 });
  drawWrapped(data.ownerName);
  y -= 8;

  drawWrapped("Property", { bold: true, size: HEADING_SIZE, paragraphGap: 4 });
  drawWrapped(data.propertyName);
  if (data.propertyAddress) drawWrapped(data.propertyAddress);
  y -= 10;

  drawWrapped("Summary", { bold: true, size: HEADING_SIZE, paragraphGap: 6 });
  ensureSpace(8);
  page.drawLine({
    start: { x: MARGIN, y: y + 2 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 2 },
    thickness: 0.75,
    color: rgb(0.75, 0.78, 0.82),
  });
  y -= 8;

  drawAmountRow("Collections", data.totalCollections);
  drawAmountRow("Operating expenses", data.totalExpenses);
  if (data.projectFee !== 0) drawAmountRow("Project fee", data.projectFee);
  drawAmountRow("Management fee", data.managementFee);
  y -= 4;
  drawAmountRow("Remittance due to owner", data.remittanceDue, true);

  y -= 8;
  drawWrapped("Line details", {
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
  if (data.lines.length === 0) {
    drawWrapped("No line items on this statement.");
  } else {
    for (const line of data.lines) {
      const label = [
        line.lineType.replaceAll("_", " "),
        line.description,
      ]
        .filter(Boolean)
        .join(" · ");
      const descLines = wrapTextToWidth(label, font, BODY_SIZE, DESC_WIDTH);
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

      const amountLabel = formatStatementMoney(line.amount);
      const amountWidth = fontBold.widthOfTextAtSize(amountLabel, BODY_SIZE);
      page.drawText(amountLabel, {
        x: PAGE_WIDTH - MARGIN - amountWidth,
        y: rowTop,
        size: BODY_SIZE,
        font: fontBold,
        color: rgb(0.05, 0.08, 0.12),
      });

      y = rowTop - rowHeight;
    }
  }

  y -= 14;
  drawWrapped(
    "Remittance is the amount due to the owner after collections, property expenses, and Harborline’s management fee.",
    { size: 9, paragraphGap: 4 }
  );
  drawWrapped("Generated by Harborline Commercial Management.", {
    size: 9,
  });

  return pdf.save();
}
