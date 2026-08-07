import { requireRole } from "@/lib/auth";
import { MgmtPnlView } from "@/components/admin/mgmt-pnl-view";
import { periodKey } from "@/lib/statements/fee-components";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function datePeriodKey(date: string | null | undefined) {
  if (!date) return null;
  return periodKey(date);
}

function inSelectedPeriod(
  date: string | null | undefined,
  selectedPeriod: string | null
) {
  if (!selectedPeriod) return true;
  return datePeriodKey(date) === selectedPeriod;
}

export default async function AdminProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { supabase } = await requireRole(["admin"]);
  const params = await searchParams;

  const [
    { data: properties },
    { data: costs },
    { data: invoices },
    { data: companyExp },
    { data: feeLines },
    { data: labor },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, owner_id, owners(company_name)")
      .order("name"),
    supabase
      .from("cost_entries")
      .select("property_id, amount, incurred_date, paid_by"),
    supabase
      .from("invoices")
      .select(
        "property_id, total, status, party_type, period_start, period_end, issue_date"
      ),
    supabase.from("company_expenses").select("amount, incurred_date"),
    supabase
      .from("journal_lines")
      .select(
        "credit, gl_accounts!inner(code), journal_entries!inner(entry_date)"
      )
      .eq("gl_accounts.code", "4000"),
    supabase.from("labor_time_entries").select("labor_cost, work_date"),
  ]);

  const periodSet = new Set<string>();
  for (const inv of invoices ?? []) {
    const key = datePeriodKey(
      inv.period_end ?? inv.period_start ?? inv.issue_date
    );
    if (key) periodSet.add(key);
  }
  for (const cost of costs ?? []) {
    const key = datePeriodKey(cost.incurred_date);
    if (key) periodSet.add(key);
  }
  for (const exp of companyExp ?? []) {
    const key = datePeriodKey(exp.incurred_date);
    if (key) periodSet.add(key);
  }
  for (const row of labor ?? []) {
    const key = datePeriodKey(row.work_date);
    if (key) periodSet.add(key);
  }
  for (const line of feeLines ?? []) {
    const entry = firstRel(
      line.journal_entries as
        | { entry_date: string }
        | { entry_date: string }[]
        | null
    );
    const key = datePeriodKey(entry?.entry_date);
    if (key) periodSet.add(key);
  }

  const periods = [...periodSet].sort((a, b) => b.localeCompare(a));
  const selectedPeriod =
    params.period &&
    params.period !== "all" &&
    periods.includes(params.period)
      ? params.period
      : null;

  const feeRevenue = (feeLines ?? []).reduce((sum, row) => {
    const entry = firstRel(
      row.journal_entries as
        | { entry_date: string }
        | { entry_date: string }[]
        | null
    );
    if (!inSelectedPeriod(entry?.entry_date, selectedPeriod)) return sum;
    return sum + Number(row.credit);
  }, 0);

  const companyCostsFromEntries = (costs ?? []).reduce((sum, row) => {
    if (row.paid_by !== "company") return sum;
    if (!inSelectedPeriod(row.incurred_date, selectedPeriod)) return sum;
    return sum + Number(row.amount);
  }, 0);

  const companyCostsFromLabor = (labor ?? []).reduce((sum, row) => {
    if (!inSelectedPeriod(row.work_date, selectedPeriod)) return sum;
    return sum + Number(row.labor_cost);
  }, 0);

  const companyCosts =
    (companyExp ?? []).reduce((sum, row) => {
      if (!inSelectedPeriod(row.incurred_date, selectedPeriod)) return sum;
      return sum + Number(row.amount);
    }, 0) +
    companyCostsFromEntries +
    companyCostsFromLabor;

  const byProperty = (properties ?? []).map((p) => {
    const revenue = (invoices ?? [])
      .filter((i) => {
        if (
          i.property_id !== p.id ||
          i.party_type !== "tenant" ||
          i.status === "void"
        ) {
          return false;
        }
        return inSelectedPeriod(
          i.period_end ?? i.period_start ?? i.issue_date,
          selectedPeriod
        );
      })
      .reduce((s, i) => s + Number(i.total), 0);
    const expense = (costs ?? [])
      .filter(
        (c) =>
          c.property_id === p.id &&
          c.paid_by !== "company" &&
          inSelectedPeriod(c.incurred_date, selectedPeriod)
      )
      .reduce((s, c) => s + Number(c.amount), 0);
    return {
      id: p.id,
      name: p.name,
      owner: firstRel(
        p.owners as
          | { company_name: string }
          | { company_name: string }[]
          | null
      )?.company_name,
      revenue,
      expense,
      noi: revenue - expense,
    };
  });

  const ownerMap = new Map<
    string,
    { name: string; revenue: number; expense: number }
  >();
  for (const row of byProperty) {
    const key = row.owner ?? "Unknown";
    const cur = ownerMap.get(key) ?? { name: key, revenue: 0, expense: 0 };
    cur.revenue += row.revenue;
    cur.expense += row.expense;
    ownerMap.set(key, cur);
  }

  const byOwner = [...ownerMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <MgmtPnlView
      periods={periods}
      selectedPeriod={selectedPeriod}
      basePath="/admin/profitability"
      feeRevenue={feeRevenue}
      companyCosts={companyCosts}
      byProperty={byProperty}
      byOwner={byOwner}
    />
  );
}
