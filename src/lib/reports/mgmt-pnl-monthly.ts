import { formatPeriodLabel, periodKey } from "@/lib/statements/fee-components";

export type MgmtPnlMonthlyPoint = {
  period: string;
  label: string;
  feeRevenue: number;
  operatingCosts: number;
  contribution: number;
};

function emptyPoint(period: string): MgmtPnlMonthlyPoint {
  return {
    period,
    label: formatPeriodLabel(period),
    feeRevenue: 0,
    operatingCosts: 0,
    contribution: 0,
  };
}

/** Robust YYYY-MM extraction for ISO dates and Date-parseable strings. */
export function monthKeyFromDate(
  date: string | null | undefined
): string | null {
  if (!date) return null;
  if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    try {
      return periodKey(date);
    } catch {
      return null;
    }
  }
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Inclusive list of YYYY-MM keys from start..end ISO dates.
 * When either bound is null ("All Periods"), uses the span of `fallbackKeys`
 * (min..max) so gaps between known months are still filled.
 */
export function enumerateMonthKeys(
  startIso: string | null,
  endIso: string | null,
  fallbackKeys: string[] = []
): string[] {
  let start = startIso?.slice(0, 7) ?? null;
  let end = endIso?.slice(0, 7) ?? null;

  if (!start || !end) {
    const sorted = [...new Set(fallbackKeys.filter(Boolean))].sort();
    if (sorted.length === 0) return [];
    start = start ?? sorted[0]!;
    end = end ?? sorted[sorted.length - 1]!;
  }

  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  if (!sy || !sm || !ey || !em) return [];

  const months: string[] = [];
  let y = sy;
  let m = sm;
  // Guard against runaway loops
  for (let i = 0; i < 240; i++) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    if (y === ey && m === em) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

/**
 * Map sparse activity buckets onto one point per month in the range
 * (zeros for months with no fee/cost activity).
 */
export function fillMgmtPnlMonthlySeries(
  series: MgmtPnlMonthlyPoint[],
  range: { start: string | null; end: string | null }
): MgmtPnlMonthlyPoint[] {
  const byPeriod = new Map(series.map((point) => [point.period, point]));
  const keys = enumerateMonthKeys(
    range.start,
    range.end,
    series.map((point) => point.period)
  );
  return keys.map((period) => byPeriod.get(period) ?? emptyPoint(period));
}

/**
 * Build monthly Fee Revenue / Operating Costs / Contribution buckets from
 * dated activity. Only months with activity are returned — use
 * {@link fillMgmtPnlMonthlySeries} to expand to a full date-range spine.
 */
export function buildMgmtPnlMonthlySeries(input: {
  feeLines: { credit: number; entryDate: string | null | undefined }[];
  companyExpenses: { amount: number; incurredDate: string | null | undefined }[];
  companyPaidCosts: { amount: number; incurredDate: string | null | undefined }[];
  selectedPeriod: string | null;
}): MgmtPnlMonthlyPoint[] {
  const buckets = new Map<string, MgmtPnlMonthlyPoint>();

  function bucket(period: string | null) {
    if (!period) return null;
    if (input.selectedPeriod && period !== input.selectedPeriod) return null;
    let point = buckets.get(period);
    if (!point) {
      point = emptyPoint(period);
      buckets.set(period, point);
    }
    return point;
  }

  for (const line of input.feeLines) {
    const point = bucket(monthKeyFromDate(line.entryDate));
    if (point) point.feeRevenue += Number(line.credit) || 0;
  }

  for (const exp of input.companyExpenses) {
    const point = bucket(monthKeyFromDate(exp.incurredDate));
    if (point) point.operatingCosts += Number(exp.amount) || 0;
  }

  for (const cost of input.companyPaidCosts) {
    const point = bucket(monthKeyFromDate(cost.incurredDate));
    if (point) point.operatingCosts += Number(cost.amount) || 0;
  }

  const series = [...buckets.values()].sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  for (const point of series) {
    point.contribution = point.feeRevenue - point.operatingCosts;
  }

  return series;
}

export function shortMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${month} '${String(y).slice(2)}`;
}

/** One-line insight from the filled monthly series for the selected range. */
export function buildMgmtPnlInsight(series: MgmtPnlMonthlyPoint[]): string {
  if (series.length === 0) {
    return "No fee or cost activity in the selected period.";
  }

  const first = series[0]!;
  const last = series[series.length - 1]!;
  const totalFee = series.reduce((s, r) => s + r.feeRevenue, 0);
  const totalOpex = series.reduce((s, r) => s + r.operatingCosts, 0);
  const totalContrib = series.reduce((s, r) => s + r.contribution, 0);

  function pctChange(from: number, to: number): number | null {
    if (from === 0) return to === 0 ? 0 : null;
    return ((to - from) / Math.abs(from)) * 100;
  }

  const contribChange = pctChange(first.contribution, last.contribution);
  const feeChange = pctChange(first.feeRevenue, last.feeRevenue);
  const opexChange = pctChange(first.operatingCosts, last.operatingCosts);

  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;

  if (contribChange != null && Math.abs(contribChange) >= 5) {
    return `Contribution ${contribChange >= 0 ? "grew" : "declined"} ${fmtPct(contribChange)} from ${shortMonthLabel(first.period)} to ${shortMonthLabel(last.period)} (range total ${formatMoneyPlain(totalContrib)}).`;
  }

  if (
    feeChange != null &&
    opexChange != null &&
    Math.abs(feeChange) >= 5 &&
    Math.abs(opexChange) < 5
  ) {
    return `Operating costs were flat while fee revenue ${feeChange >= 0 ? "increased" : "decreased"} ${fmtPct(feeChange)} over the selected period.`;
  }

  if (
    opexChange != null &&
    feeChange != null &&
    Math.abs(opexChange) >= 5 &&
    Math.abs(feeChange) < 5
  ) {
    return `Fee revenue was flat while operating costs ${opexChange >= 0 ? "rose" : "fell"} ${fmtPct(opexChange)} over the selected period.`;
  }

  if (totalFee === 0 && totalOpex === 0) {
    return "No fee or cost amounts recorded across the selected months.";
  }

  return `Across ${series.length} months, fee revenue totaled ${formatMoneyPlain(totalFee)} and operating costs ${formatMoneyPlain(totalOpex)} (contribution ${formatMoneyPlain(totalContrib)}).`;
}

function formatMoneyPlain(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
