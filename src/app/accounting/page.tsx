import Link from "next/link";
import { requireExactRole } from "@/lib/auth";
import {
  BreakdownPie,
  withPieColors,
} from "@/components/accounting/breakdown-pie";
import { Badge, Card, Stat } from "@/components/ui";
import {
  FEE_LINE_LABELS,
  FEE_LINE_TYPES,
  fetchFeeStatements,
  sumFeeTotals,
} from "@/lib/statements/fee-components";
import { formatMoney } from "@/lib/utils";

export default async function AccountingDashboardPage() {
  const { supabase } = await requireExactRole(["accounting"]);

  const [
    { data: feeLines },
    { data: companyExp },
    { data: periods },
    { data: properties },
    { data: invoices },
    { data: costs },
    statementRows,
  ] = await Promise.all([
    supabase
      .from("journal_lines")
      .select("credit, gl_accounts!inner(code)")
      .eq("gl_accounts.code", "4000"),
    supabase.from("company_expenses").select("category, amount"),
    supabase
      .from("accounting_periods")
      .select("id, year, month, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(24),
    supabase.from("properties").select("id, name"),
    supabase
      .from("invoices")
      .select("property_id, total, status, party_type"),
    supabase.from("cost_entries").select("property_id, amount"),
    fetchFeeStatements(supabase).catch(() => []),
  ]);

  const feeRevenue = (feeLines ?? []).reduce((s, r) => s + Number(r.credit), 0);
  const companyCosts = (companyExp ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0
  );
  const contribution = feeRevenue - companyCosts;

  const feeTotals = sumFeeTotals(statementRows);
  const feeMixSlices = withPieColors(
    FEE_LINE_TYPES.map((t) => ({
      label: FEE_LINE_LABELS[t],
      value: feeTotals[t],
    })).filter((s) => s.value > 0)
  );

  const opexByCategory = new Map<string, number>();
  for (const row of companyExp ?? []) {
    const cat = String(row.category || "other");
    opexByCategory.set(cat, (opexByCategory.get(cat) ?? 0) + Number(row.amount));
  }
  const opexSlices = withPieColors(
    [...opexByCategory.entries()]
      .map(([label, value]) => ({
        label: label.replaceAll("_", " "),
        value,
      }))
      .sort((a, b) => b.value - a.value)
  );

  const openPeriods = (periods ?? []).filter((p) => p.status === "open");
  const latestOpen = openPeriods[0] ?? null;
  const latestClosed =
    (periods ?? []).find((p) => p.status === "closed") ?? null;

  const weak = (properties ?? [])
    .map((p) => {
      const revenue = (invoices ?? [])
        .filter(
          (i) =>
            i.property_id === p.id &&
            i.party_type === "tenant" &&
            i.status !== "void"
        )
        .reduce((s, i) => s + Number(i.total), 0);
      const expense = (costs ?? [])
        .filter((c) => c.property_id === p.id)
        .reduce((s, c) => s + Number(c.amount), 0);
      return { id: p.id, name: p.name, noi: revenue - expense };
    })
    .filter((p) => p.noi < 0)
    .sort((a, b) => a.noi - b.noi);

  const overdueAr = (invoices ?? [])
    .filter(
      (i) =>
        i.party_type === "tenant" &&
        (i.status === "overdue" || i.status === "partial")
    )
    .reduce((s, i) => s + Number(i.total), 0);

  function periodLabel(p: { year: number; month: number }) {
    return `${p.year}-${String(p.month).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Harborline company snapshot and exceptions. Open Statements or
          Profitability for detail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Company fee revenue"
          value={formatMoney(feeRevenue)}
          hint="GL 4000 · credit-based fees on collections"
        />
        <Stat
          label="Company operating costs"
          value={formatMoney(companyCosts)}
          hint="Harborline company_expenses"
        />
        <Stat
          label="Company contribution"
          value={formatMoney(contribution)}
          hint="Fees − company OpEx (not property NOI)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Fee mix">
          <p className="mb-3 text-xs text-slate-500">
            Agency fee components from owner statements (may differ slightly
            from GL 4000 total).
          </p>
          <BreakdownPie
            slices={feeMixSlices}
            emptyMessage="No statement fee components to chart."
          />
        </Card>
        <Card title="Company OpEx by category">
          <p className="mb-3 text-xs text-slate-500">
            Harborline company_expenses only — not owner property costs.
          </p>
          <BreakdownPie
            slices={opexSlices}
            emptyMessage="No company operating expenses to chart."
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Accounting periods">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Open periods</span>
              <span className="font-medium">{openPeriods.length}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Latest open</span>
              <span className="flex items-center gap-2">
                {latestOpen ? (
                  <>
                    <span>{periodLabel(latestOpen)}</span>
                    <Badge status={latestOpen.status} />
                  </>
                ) : (
                  <span className="text-slate-500">None</span>
                )}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Latest closed</span>
              <span className="flex items-center gap-2">
                {latestClosed ? (
                  <>
                    <span>{periodLabel(latestClosed)}</span>
                    <Badge status={latestClosed.status} />
                  </>
                ) : (
                  <span className="text-slate-500">None</span>
                )}
              </span>
            </li>
          </ul>
        </Card>

        <Card title="Quick links">
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/accounting/statements"
                className="text-[#c4784a] hover:underline"
              >
                Statements · fee components
              </Link>
            </li>
            <li>
              <Link
                href="/accounting/profitability"
                className="text-[#c4784a] hover:underline"
              >
                Profitability · Management
              </Link>
            </li>
            <li>
              <Link
                href="/accounting/reports/property-pnl"
                className="text-[#c4784a] hover:underline"
              >
                Profitability · Property
              </Link>
            </li>
            <li>
              <Link
                href="/accounting/reports/expense-breakdown"
                className="text-[#c4784a] hover:underline"
              >
                Owner Expenses · allocation
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Tenant AR overdue/partial (billed): {formatMoney(overdueAr)}
          </p>
        </Card>
      </div>

      <Card
        title="Exceptions · weak NOI properties"
        action={
          <Link
            href="/accounting/profitability"
            className="text-sm text-[#c4784a] hover:underline"
          >
            View Management
          </Link>
        }
      >
        {weak.length === 0 ? (
          <p className="text-sm text-slate-600">
            No properties with negative NOI in the current rollup.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-rose-800">
            {weak.slice(0, 8).map((p) => (
              <li key={p.id} className="flex justify-between gap-4">
                <span>{p.name}</span>
                <span className="tabular-nums">{formatMoney(p.noi)}</span>
              </li>
            ))}
            {weak.length > 8 ? (
              <li className="pt-1 text-slate-500">
                +{weak.length - 8} more — open Management for the full list
              </li>
            ) : null}
          </ul>
        )}
      </Card>
    </div>
  );
}
