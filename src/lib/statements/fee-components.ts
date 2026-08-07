import type { SupabaseClient } from "@supabase/supabase-js";

export const FEE_LINE_TYPES = [
  "management_fee",
  "leasing_commission",
  "project_fee",
  "renewal_fee",
  "late_fee_retained",
] as const;

export type FeeLineType = (typeof FEE_LINE_TYPES)[number];

export const FEE_LINE_LABELS: Record<FeeLineType, string> = {
  // Base fee amounts are tenant credit-based % of collections (not MA.fee_percent).
  management_fee: "Base management fee",
  leasing_commission: "Leasing commission",
  project_fee: "Project / CM fee",
  renewal_fee: "Renewal fee",
  late_fee_retained: "Late fee retained",
};

export type FeeLine = {
  line_type: string;
  description: string;
  amount: number;
};

export type FeeStatementRow = {
  id: string;
  statement_number: string;
  property_id: string;
  property_name: string;
  owner_name: string;
  period_start: string;
  period_end: string;
  status: string;
  total_collections: number;
  total_expenses: number;
  management_fee: number;
  remittance_due: number;
  fees: Record<FeeLineType, number>;
  fee_lines: FeeLine[];
};

export type FeeComponentTotals = Record<FeeLineType, number> & {
  agency_total: number;
};

function emptyFees(): Record<FeeLineType, number> {
  return {
    management_fee: 0,
    leasing_commission: 0,
    project_fee: 0,
    renewal_fee: 0,
    late_fee_retained: 0,
  };
}

export function isFeeLineType(t: string): t is FeeLineType {
  return (FEE_LINE_TYPES as readonly string[]).includes(t);
}

export function sumFeeTotals(rows: FeeStatementRow[]): FeeComponentTotals {
  const fees = emptyFees();
  for (const row of rows) {
    for (const t of FEE_LINE_TYPES) {
      fees[t] += row.fees[t];
    }
  }
  return {
    ...fees,
    agency_total: FEE_LINE_TYPES.reduce((s, t) => s + fees[t], 0),
  };
}

export function periodKey(periodEnd: string): string {
  return periodEnd.slice(0, 7);
}

export function formatPeriodLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type StatementQueryRow = {
  id: string;
  statement_number: string;
  property_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_collections: number | string;
  total_expenses: number | string;
  management_fee: number | string;
  remittance_due: number | string;
  properties: { name: string } | { name: string }[] | null;
  owners: { company_name: string } | { company_name: string }[] | null;
  owner_statement_lines:
    | { line_type: string; description: string; amount: number | string }[]
    | null;
};

function unwrapOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function fetchFeeStatements(
  supabase: SupabaseClient
): Promise<FeeStatementRow[]> {
  // Paginate so "All periods" is never truncated by PostgREST max-rows.
  const pageSize = 1000;
  const raw: StatementQueryRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("owner_statements")
      .select(
        "id, statement_number, property_id, period_start, period_end, status, total_collections, total_expenses, management_fee, remittance_due, properties(name), owners(company_name), owner_statement_lines(line_type, description, amount)"
      )
      .order("period_end", { ascending: false })
      .order("statement_number", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as StatementQueryRow[];
    raw.push(...batch);
    if (batch.length < pageSize) break;
  }

  return raw.map((s) => {
    const prop = unwrapOne(s.properties);
    const owner = unwrapOne(s.owners);
    const allLines = s.owner_statement_lines ?? [];
    const fee_lines: FeeLine[] = allLines
      .filter((l) => isFeeLineType(l.line_type))
      .map((l) => ({
        line_type: l.line_type,
        description: l.description,
        // Lines are signed as owner deductions; UI shows agency take as positive.
        amount: Math.abs(Number(l.amount)),
      }));
    const fees = emptyFees();
    for (const l of fee_lines) {
      if (isFeeLineType(l.line_type)) {
        fees[l.line_type] += l.amount;
      }
    }
    return {
      id: s.id,
      statement_number: s.statement_number,
      property_id: s.property_id,
      property_name: prop?.name ?? "Property",
      owner_name: owner?.company_name ?? "Owner",
      period_start: s.period_start,
      period_end: s.period_end,
      status: s.status,
      total_collections: Number(s.total_collections),
      total_expenses: Number(s.total_expenses),
      management_fee: Number(s.management_fee),
      remittance_due: Number(s.remittance_due),
      fees,
      fee_lines,
    };
  });
}

export function uniquePeriods(rows: FeeStatementRow[]): string[] {
  const set = new Set(rows.map((r) => periodKey(r.period_end)));
  return [...set].sort((a, b) => b.localeCompare(a));
}
