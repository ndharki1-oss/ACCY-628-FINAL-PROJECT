import { periodKey } from "@/lib/statements/fee-components";

export type PropertyPnLChartActivity = {
  propertyId: string;
  propertyName: string;
  ownerName: string;
  /** ISO date YYYY-MM-DD used for range filtering */
  date: string;
  revenue: number;
  expenses: number;
};

export type PropertyPnLChartMetric = "revenue" | "expenses" | "noi";

export type PropertyPnLChartRangePreset =
  | "3m"
  | "6m"
  | "12m"
  | "all"
  | "custom";

export type PropertyPnLChartAggRow = {
  propertyId: string;
  propertyName: string;
  ownerName: string;
  revenue: number;
  expenses: number;
  noi: number;
};

export function metricLabel(metric: PropertyPnLChartMetric): string {
  if (metric === "revenue") return "Revenue";
  if (metric === "expenses") return "OpEx";
  return "NOI";
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function addMonthsUtc(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function todayIsoDate(now = new Date()): string {
  const yy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function resolveChartDateRange(input: {
  preset: PropertyPnLChartRangePreset;
  customStart: string;
  customEnd: string;
  today?: string;
}): { start: string | null; end: string | null } {
  const today = input.today ?? todayIsoDate();
  if (input.preset === "all") return { start: null, end: null };
  if (input.preset === "custom") {
    const start = toIsoDate(input.customStart);
    const end = toIsoDate(input.customEnd);
    if (start && end && start > end) return { start: end, end: start };
    return { start, end };
  }
  const months =
    input.preset === "3m" ? 3 : input.preset === "6m" ? 6 : 12;
  return {
    start: addMonthsUtc(today, -months),
    end: today,
  };
}

export function inDateRange(
  date: string,
  range: { start: string | null; end: string | null }
): boolean {
  const iso = toIsoDate(date);
  if (!iso) return false;
  if (range.start && iso < range.start) return false;
  if (range.end && iso > range.end) return false;
  return true;
}

export function aggregatePropertyPnLChart(
  activity: PropertyPnLChartActivity[],
  opts: {
    ownerName: string | "all";
    range: { start: string | null; end: string | null };
  }
): PropertyPnLChartAggRow[] {
  const map = new Map<string, PropertyPnLChartAggRow>();

  for (const row of activity) {
    if (opts.ownerName !== "all" && row.ownerName !== opts.ownerName) {
      continue;
    }
    if (!inDateRange(row.date, opts.range)) continue;

    const cur = map.get(row.propertyId) ?? {
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      ownerName: row.ownerName,
      revenue: 0,
      expenses: 0,
      noi: 0,
    };
    cur.revenue += Number(row.revenue) || 0;
    cur.expenses += Number(row.expenses) || 0;
    cur.noi = cur.revenue - cur.expenses;
    map.set(row.propertyId, cur);
  }

  return [...map.values()].sort((a, b) =>
    a.propertyName.localeCompare(b.propertyName)
  );
}

export type OwnerPnLChartAggRow = {
  ownerName: string;
  revenue: number;
  expenses: number;
  noi: number;
  propertyCount: number;
};

export function aggregateOwnerPnLChart(
  activity: PropertyPnLChartActivity[],
  opts: {
    ownerName: string | "all";
    range: { start: string | null; end: string | null };
  }
): OwnerPnLChartAggRow[] {
  const map = new Map<
    string,
    OwnerPnLChartAggRow & { propertyIds: Set<string> }
  >();

  for (const row of activity) {
    if (opts.ownerName !== "all" && row.ownerName !== opts.ownerName) {
      continue;
    }
    if (!inDateRange(row.date, opts.range)) continue;

    const cur = map.get(row.ownerName) ?? {
      ownerName: row.ownerName,
      revenue: 0,
      expenses: 0,
      noi: 0,
      propertyCount: 0,
      propertyIds: new Set<string>(),
    };
    cur.revenue += Number(row.revenue) || 0;
    cur.expenses += Number(row.expenses) || 0;
    cur.noi = cur.revenue - cur.expenses;
    cur.propertyIds.add(row.propertyId);
    cur.propertyCount = cur.propertyIds.size;
    map.set(row.ownerName, cur);
  }

  return [...map.values()]
    .map(({ propertyIds: _ids, ...row }) => row)
    .sort((a, b) => a.ownerName.localeCompare(b.ownerName));
}

/**
 * Green = favorable outlier, red = unfavorable / negative, navy = near average.
 * For OpEx, lower is better.
 */
export function outlierBarColor(
  value: number,
  average: number,
  higherIsBetter = true
): string {
  const NEGATIVE = "#dc2626";
  const FAVORABLE = "#059669";
  const UNFAVORABLE = "#e11d48";
  const NEAR = "#0c1f2e";

  if (value < 0 && higherIsBetter) return NEGATIVE;

  const scale = Math.max(Math.abs(average), Math.abs(value), 1);
  const near = Math.abs(value - average) / scale <= 0.12;
  if (near) return NEAR;

  if (higherIsBetter) {
    return value > average ? FAVORABLE : UNFAVORABLE;
  }
  return value < average ? FAVORABLE : UNFAVORABLE;
}

/** Prefer invoice period_end, then period_start, then issue_date. */
export function invoiceActivityDate(row: {
  period_end?: string | null;
  period_start?: string | null;
  issue_date?: string | null;
}): string | null {
  return (
    toIsoDate(row.period_end) ??
    toIsoDate(row.period_start) ??
    toIsoDate(row.issue_date)
  );
}

export function monthLabelFromIso(isoDate: string): string {
  const key = periodKey(isoDate);
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return isoDate;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
