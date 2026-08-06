export type NoiRangeKey = "month" | "quarter" | "ytd";

export const NOI_RANGE_OPTIONS: { key: NoiRangeKey; label: string }[] = [
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "ytd", label: "Year to Date" },
];

export function parseNoiRange(raw: string | undefined | null): NoiRangeKey {
  if (raw === "quarter" || raw === "ytd" || raw === "month") return raw;
  return "month";
}

/** Inclusive calendar date bounds for the selected relative range. */
export function noiRangeBounds(
  range: NoiRangeKey,
  now = new Date()
): { start: string; end: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const end = new Date(y, m + 1, 0);
  const endStr = toISODate(end);

  if (range === "month") {
    const start = new Date(y, m, 1);
    return {
      start: toISODate(start),
      end: endStr,
      label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
  }

  if (range === "quarter") {
    const qStartMonth = Math.floor(m / 3) * 3;
    const start = new Date(y, qStartMonth, 1);
    const q = Math.floor(m / 3) + 1;
    return {
      start: toISODate(start),
      end: endStr,
      label: `Q${q} ${y}`,
    };
  }

  // ytd
  const start = new Date(y, 0, 1);
  return {
    start: toISODate(start),
    end: endStr,
    label: `YTD ${y}`,
  };
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKeyFromDate(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Last N calendar months ending at current month (oldest → newest). */
export function lastNMonthKeys(n: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return keys;
}

export function monthBounds(yyyyMm: string): { start: string; end: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const start = `${yyyyMm}-01`;
  const end = toISODate(new Date(y, m, 0));
  return { start, end };
}

export function invoiceInRange(
  inv: {
    period_end?: string | null;
    due_date?: string | null;
    issue_date?: string | null;
  },
  start: string,
  end: string
): boolean {
  const period = inv.period_end ?? inv.due_date ?? inv.issue_date;
  if (!period) return false;
  return period >= start && period <= end;
}

export function formatNoiMargin(noi: number, charges: number): string {
  if (charges === 0) return "—";
  return `${((noi / charges) * 100).toFixed(1)}%`;
}

/**
 * Margin tone for display only.
 * ≥20% strong · 0–&lt;20% calm · &lt;0 to &gt;−10% caution · ≤−10% alert
 */
export function noiMarginToneClass(noi: number, charges: number): string {
  if (charges === 0) return "text-slate-400";
  const pct = (noi / charges) * 100;
  if (pct >= 20) return "text-emerald-700";
  if (pct >= 0) return "text-slate-600";
  if (pct > -10) return "text-amber-700";
  return "text-rose-700";
}

/** Calendar window of equal type immediately before the selected range. */
export function noiPriorRangeBounds(
  range: NoiRangeKey,
  now = new Date()
): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();

  if (range === "month") {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { start: toISODate(start), end: toISODate(end) };
  }

  if (range === "quarter") {
    const qStartMonth = Math.floor(m / 3) * 3;
    const start = new Date(y, qStartMonth - 3, 1);
    const end = new Date(y, qStartMonth, 0);
    return { start: toISODate(start), end: toISODate(end) };
  }

  // Prior YTD through the same month-end last year
  const start = new Date(y - 1, 0, 1);
  const end = new Date(y - 1, m + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

/** % change vs prior NOI for trend chip; null when not meaningful. */
export function noiPriorChangePct(
  currentNoi: number,
  priorNoi: number
): number | null {
  if (Math.abs(priorNoi) < 0.005) return null;
  return ((currentNoi - priorNoi) / Math.abs(priorNoi)) * 100;
}

export function formatNoiChangePct(pct: number): string {
  const abs = Math.abs(pct);
  const rounded = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  return `${rounded}%`;
}

/** Rent vs other tenant charge lines from invoice_lines.line_type. */
export function classifyIncomeLine(lineType: string): "rent" | "other" {
  const t = lineType.toLowerCase();
  if (t === "rent" || t === "base_rent" || t.includes("base rent")) return "rent";
  return "other";
}
