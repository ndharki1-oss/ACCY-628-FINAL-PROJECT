import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export type AccountingPeriodOption = {
  key: string;
  year: number;
  month: number;
  status: string;
};

export type MonthlyRentSummary = {
  rentDue: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
};

function padMonth(month: number) {
  return String(month).padStart(2, "0");
}

export function periodKeyFromParts(year: number, month: number) {
  return `${year}-${padMonth(month)}`;
}

export function formatAccountingPeriodLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthBounds(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const year = y!;
  const month = m!;
  const start = `${year}-${padMonth(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${padMonth(month)}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function invoiceOverlapsMonth(
  invoice: {
    period_start: string | null;
    period_end: string | null;
    issue_date: string;
    due_date: string;
  },
  monthStart: string,
  monthEnd: string
) {
  const start = invoice.period_start ?? invoice.issue_date;
  const end = invoice.period_end ?? invoice.due_date;
  if (!start || !end) return false;
  return start <= monthEnd && end >= monthStart;
}

type RentInvoice = {
  lease_id: string | null;
  total: number | string;
  amount_paid: number | string;
  period_start: string | null;
  period_end: string | null;
  issue_date: string;
  due_date: string;
};

async function loadActiveLeaseRentInvoices(supabase: AnyClient) {
  const [{ data: leases }, { data: invoices }] = await Promise.all([
    supabase.from("leases").select("id").eq("status", "active"),
    supabase
      .from("invoices")
      .select(
        "lease_id, total, amount_paid, status, party_type, period_start, period_end, issue_date, due_date"
      )
      .eq("party_type", "tenant")
      .neq("status", "void"),
  ]);

  const activeLeaseIds = new Set((leases ?? []).map((l) => l.id));
  const rentInvoices = ((invoices ?? []) as RentInvoice[]).filter(
    (inv) =>
      inv.lease_id &&
      activeLeaseIds.has(inv.lease_id) &&
      Number(inv.total) > 0
  );

  return rentInvoices;
}

function periodHasRent(periodKey: string, invoices: RentInvoice[]) {
  const { start, end } = monthBounds(periodKey);
  return invoices.some((inv) => invoiceOverlapsMonth(inv, start, end));
}

/** Accounting periods that have at least one active-lease tenant rent invoice. */
export async function listAccountingPeriods(
  supabase: AnyClient
): Promise<AccountingPeriodOption[]> {
  const [{ data }, rentInvoices] = await Promise.all([
    supabase
      .from("accounting_periods")
      .select("year, month, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
    loadActiveLeaseRentInvoices(supabase),
  ]);

  return (data ?? [])
    .map((p) => ({
      key: periodKeyFromParts(p.year, p.month),
      year: p.year,
      month: p.month,
      status: p.status,
    }))
    .filter((p) => periodHasRent(p.key, rentInvoices));
}

/** `null` selectedPeriod means Total (all periods). Default = latest period key. */
export function resolveSelectedPeriod(
  param: string | undefined,
  periods: AccountingPeriodOption[]
): string | null {
  if (param === "all") return null;
  if (param && periods.some((p) => p.key === param)) return param;
  return periods[0]?.key ?? null;
}

export async function fetchMonthlyRentSummary(
  supabase: AnyClient,
  selectedPeriod: string | null
): Promise<MonthlyRentSummary> {
  let scoped = await loadActiveLeaseRentInvoices(supabase);

  if (selectedPeriod) {
    const { start, end } = monthBounds(selectedPeriod);
    scoped = scoped.filter((inv) => invoiceOverlapsMonth(inv, start, end));
  }

  const rentDue = scoped.reduce((s, inv) => s + Number(inv.total), 0);
  const collected = scoped.reduce(
    (s, inv) => s + Math.min(Number(inv.amount_paid), Number(inv.total)),
    0
  );
  const outstanding = Math.max(0, rentDue - collected);
  const collectionRate = rentDue > 0 ? (collected / rentDue) * 100 : 0;

  return { rentDue, collected, outstanding, collectionRate };
}
