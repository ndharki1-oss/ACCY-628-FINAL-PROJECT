import type { FeeRevenueLine } from "@/components/admin-fee-revenue-breakdown";

export type GlFeeCreditRow = {
  id: string;
  credit: number;
  ownerName: string | null;
  propertyName: string | null;
  entryDate: string | null;
  entryNumber: string | null;
  memo: string | null;
};

export type StatementFeeSlice = {
  id: string;
  amount: number;
  ownerName: string;
  propertyName: string;
  statementNumber: string;
  periodStart: string;
  periodEnd: string;
  feeType: string;
  description: string;
};

function monthKey(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const key = isoDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
}

/**
 * Build fee-revenue drill-down lines whose amounts sum to GL 4000 credits.
 * Owner-tagged journal lines map 1:1; pooled monthly journals are spread
 * across owners using that month's owner-statement fee lines.
 */
export function buildGlFeeRevenueLines(
  glRows: GlFeeCreditRow[],
  statementSlices: StatementFeeSlice[]
): FeeRevenueLine[] {
  const slicesByMonth = new Map<string, StatementFeeSlice[]>();
  for (const slice of statementSlices) {
    const key = monthKey(slice.periodEnd);
    if (!key) continue;
    const list = slicesByMonth.get(key) ?? [];
    list.push(slice);
    slicesByMonth.set(key, list);
  }

  const lines: FeeRevenueLine[] = [];

  for (const gl of glRows) {
    const credit = Number(gl.credit) || 0;
    if (credit <= 0) continue;
    const entryDate = gl.entryDate?.slice(0, 10) ?? "";
    const periodLabel = entryDate || "—";

    if (gl.ownerName) {
      lines.push({
        id: `gl-${gl.id}`,
        amount: credit,
        ownerName: gl.ownerName,
        propertyName: gl.propertyName ?? "Unassigned property",
        statementNumber: gl.entryNumber ?? "—",
        periodLabel,
        periodEnd: entryDate,
        feeType: "management_fee",
        description: gl.memo ?? "GL 4000 fee recognition",
      });
      continue;
    }

    const key = monthKey(entryDate);
    const monthSlices = key ? slicesByMonth.get(key) ?? [] : [];
    const sliceTotal = monthSlices.reduce((s, row) => s + row.amount, 0);

    if (sliceTotal <= 0.009 || monthSlices.length === 0) {
      lines.push({
        id: `gl-${gl.id}`,
        amount: credit,
        ownerName: "Unassigned owner",
        propertyName: gl.propertyName ?? "Unassigned property",
        statementNumber: gl.entryNumber ?? "—",
        periodLabel,
        periodEnd: entryDate,
        feeType: "management_fee",
        description: gl.memo ?? "GL 4000 fee recognition (unallocated)",
      });
      continue;
    }

    let allocated = 0;
    monthSlices.forEach((slice, index) => {
      const isLast = index === monthSlices.length - 1;
      const share = isLast
        ? Math.round((credit - allocated) * 100) / 100
        : Math.round((credit * (slice.amount / sliceTotal)) * 100) / 100;
      allocated = Math.round((allocated + share) * 100) / 100;
      lines.push({
        id: `gl-${gl.id}-slice-${slice.id}`,
        amount: share,
        ownerName: slice.ownerName,
        propertyName: slice.propertyName,
        statementNumber: slice.statementNumber,
        periodLabel:
          slice.periodStart && slice.periodEnd
            ? `${slice.periodStart} → ${slice.periodEnd}`
            : periodLabel,
        periodEnd: entryDate || slice.periodEnd,
        feeType: slice.feeType,
        description: slice.description,
      });
    });
  }

  return lines;
}
