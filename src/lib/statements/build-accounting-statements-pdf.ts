import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import {
  formatStatementDisplayDate,
  formatStatementMoney,
} from "@/lib/owner-statements/types";
import {
  FEE_LINE_LABELS,
  FEE_LINE_TYPES,
  formatPeriodLabel,
  periodKey,
  sumFeeTotals,
  type FeeStatementRow,
} from "@/lib/statements/fee-components";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const TITLE_SIZE = 18;
const HEADING_SIZE = 11;
const BODY_SIZE = 10;
const AMOUNT_COL_WIDTH = 78;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const DESC_WIDTH = CONTENT_WIDTH - AMOUNT_COL_WIDTH - 12;

export type AccountingStatementsPdfOptions = {
  /** Shown in the PDF header, e.g. "March 2026" or "All periods" */
  periodLabel: string;
  /** Optional note about active filters */
  filterNote?: string | null;
};

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

function projectFeeForRow(row: FeeStatementRow) {
  return row.fees.project_fee;
}

/**
 * Builds an accounting export PDF for one or more filtered owner statements.
 */
export async function buildAccountingStatementsPdf(
  rows: FeeStatementRow[],
  options: AccountingStatementsPdfOptions
) {
  if (rows.length === 0) {
    throw new Error("No statements to export.");
  }

  const pdf = await PDFDocument.create();
  const title =
    rows.length === 1
      ? `${rows[0].statement_number} · Accounting export`
      : `Accounting statements export (${rows.length})`;
  pdf.setTitle(title);
  pdf.setAuthor("Harborline Commercial Management");
  pdf.setSubject("Accounting owner remittances and fee components");

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

  const drawDivider = () => {
    ensureSpace(12);
    page.drawLine({
      start: { x: MARGIN, y: y + 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 2 },
      thickness: 0.75,
      color: rgb(0.75, 0.78, 0.82),
    });
    y -= 8;
  };

  const startNewPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const totals = sumFeeTotals(rows);
  const remittanceTotal = rows.reduce((s, r) => s + r.remittance_due, 0);
  const collectionsTotal = rows.reduce((s, r) => s + r.total_collections, 0);
  const expenseTotal = rows.reduce((s, r) => s + r.total_expenses, 0);

  // Summary cover
  drawWrapped("HARBORLINE COMMERCIAL MANAGEMENT", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 4,
  });
  drawWrapped("Accounting · Owner remittances & fees", {
    bold: true,
    size: TITLE_SIZE,
    paragraphGap: 10,
  });
  drawWrapped(`Period: ${options.periodLabel}`);
  drawWrapped(
    `Statements in export: ${rows.length}`
  );
  if (options.filterNote) {
    drawWrapped(`Filters: ${options.filterNote}`);
  }
  y -= 8;

  drawWrapped("Export totals", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 6,
  });
  drawDivider();
  drawAmountRow("Collections", collectionsTotal);
  drawAmountRow("Operating expenses", expenseTotal);
  drawAmountRow("Agency fee total", totals.agency_total);
  for (const t of FEE_LINE_TYPES) {
    if (totals[t] > 0.009) {
      drawAmountRow(`  ${FEE_LINE_LABELS[t]}`, totals[t]);
    }
  }
  y -= 4;
  drawAmountRow("Remittance due to owners", remittanceTotal, true);

  y -= 10;
  drawWrapped("Included statements", {
    bold: true,
    size: HEADING_SIZE,
    paragraphGap: 6,
  });
  drawDivider();

  for (const row of rows) {
    const line = `${row.statement_number} · ${row.property_name} · ${row.owner_name} · Remittance ${formatStatementMoney(row.remittance_due)}`;
    drawWrapped(line, { size: 9, paragraphGap: 2 });
  }

  drawWrapped("Generated by Harborline Commercial Management.", {
    size: 9,
    paragraphGap: 0,
  });

  // Detail pages — one statement (or continue after summary for single)
  for (const row of rows) {
    startNewPage();

    drawWrapped("HARBORLINE COMMERCIAL MANAGEMENT", {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 4,
    });
    drawWrapped("Owner statement detail", {
      bold: true,
      size: TITLE_SIZE,
      paragraphGap: 10,
    });

    drawWrapped(`Statement: ${row.statement_number}`);
    drawWrapped(`Status: ${row.status.replaceAll("_", " ")}`);
    drawWrapped(
      `Period: ${formatStatementDisplayDate(row.period_start)} – ${formatStatementDisplayDate(row.period_end)}`
    );
    drawWrapped(
      `Calendar period: ${formatPeriodLabel(periodKey(row.period_end))}`
    );
    y -= 8;

    drawWrapped("Owner", { bold: true, size: HEADING_SIZE, paragraphGap: 4 });
    drawWrapped(row.owner_name);
    y -= 8;

    drawWrapped("Property", {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 4,
    });
    drawWrapped(row.property_name);
    y -= 10;

    drawWrapped("Summary", {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 6,
    });
    drawDivider();
    drawAmountRow("Collections", row.total_collections);
    drawAmountRow("Operating expenses", row.total_expenses);
    const projectFee = projectFeeForRow(row);
    if (projectFee !== 0) drawAmountRow("Project fee", projectFee);
    drawAmountRow("Management fee (header)", row.management_fee);
    y -= 4;
    drawAmountRow("Remittance due to owner", row.remittance_due, true);

    y -= 8;
    drawWrapped("Fee components", {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 6,
    });
    drawDivider();
    const activeFees = FEE_LINE_TYPES.filter((t) => row.fees[t] > 0.009);
    if (activeFees.length === 0) {
      drawWrapped("No fee components recorded.");
    } else {
      for (const t of activeFees) {
        drawAmountRow(FEE_LINE_LABELS[t], row.fees[t]);
      }
    }

    y -= 8;
    drawWrapped("Fee line detail", {
      bold: true,
      size: HEADING_SIZE,
      paragraphGap: 6,
    });
    drawDivider();

    const bodySpacing = lineGap(BODY_SIZE);
    if (row.fee_lines.length === 0) {
      drawWrapped("No agency fee lines on this statement.");
    } else {
      for (const line of row.fee_lines) {
        const label = [
          line.line_type.replaceAll("_", " "),
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
    drawWrapped("Accounting portal export · Harborline Commercial Management.", {
      size: 9,
    });
  }

  return pdf.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function accountingExportFilename(
  rows: FeeStatementRow[],
  periodLabel: string
) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (rows.length === 1) {
    return `${rows[0].statement_number}-Accounting-Export.pdf`;
  }
  const periodSlug = periodLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `accounting-statements-${periodSlug || "export"}-${stamp}.pdf`;
}
