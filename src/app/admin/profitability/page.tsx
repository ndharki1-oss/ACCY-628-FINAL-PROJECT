import { requireRole } from "@/lib/auth";
import { Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AdminProfitabilityPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, owner_id, owners(company_name)");
  const { data: costs } = await supabase
    .from("cost_entries")
    .select("property_id, amount");
  const { data: invoices } = await supabase
    .from("invoices")
    .select("property_id, total, status, party_type");
  const { data: companyExp } = await supabase
    .from("company_expenses")
    .select("amount");
  const { data: feeLines } = await supabase
    .from("journal_lines")
    .select("credit, gl_accounts!inner(code)")
    .eq("gl_accounts.code", "4000");

  const feeRevenue = (feeLines ?? []).reduce((s, r) => s + Number(r.credit), 0);
  const companyCosts = (companyExp ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const byProperty = (properties ?? []).map((p) => {
    const revenue = (invoices ?? [])
      .filter((i) => i.property_id === p.id && i.party_type === "tenant" && i.status !== "void")
      .reduce((s, i) => s + Number(i.total), 0);
    const expense = (costs ?? [])
      .filter((c) => c.property_id === p.id)
      .reduce((s, c) => s + Number(c.amount), 0);
    return {
      id: p.id,
      name: p.name,
      owner: (Array.isArray(p.owners) ? p.owners[0] : p.owners)?.company_name,
      revenue,
      expense,
      noi: revenue - expense,
    };
  });

  const ownerMap = new Map<string, { name: string; revenue: number; expense: number }>();
  for (const row of byProperty) {
    const key = row.owner ?? "Unknown";
    const cur = ownerMap.get(key) ?? { name: key, revenue: 0, expense: 0 };
    cur.revenue += row.revenue;
    cur.expense += row.expense;
    ownerMap.set(key, cur);
  }

  const weak = byProperty.filter((p) => p.noi < 0);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Profitability
      </h1>
      <p className="text-sm text-slate-600">{ALL_PERIODS_HINT}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Company fee revenue"
          value={formatMoney(feeRevenue)}
          hint={`${ALL_PERIODS_HINT} · GL 4000 = credit-based base management fees on collections`}
        />
        <Stat
          label="Company operating costs"
          value={formatMoney(companyCosts)}
          hint={`${ALL_PERIODS_HINT} · Harborline company_expenses (not owner property OpEx)`}
        />
        <Stat
          label="Company contribution"
          value={formatMoney(feeRevenue - companyCosts)}
          hint={`${ALL_PERIODS_HINT} · Fees − Harborline OpEx (not property NOI)`}
        />
      </div>

      {weak.length > 0 ? (
        <Card title={`Alerts: unprofitable / weak NOI properties · ${ALL_PERIODS_HINT}`}>
          <ul className="space-y-1 text-sm text-rose-800">
            {weak.map((p) => (
              <li key={p.id}>
                {p.name}: NOI {formatMoney(p.noi)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title={`NOI by property · ${ALL_PERIODS_HINT}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Property</th>
                <th className="py-2">Owner</th>
                <th className="py-2">Tenant charges</th>
                <th className="py-2">OpEx</th>
                <th className="py-2">NOI</th>
              </tr>
            </thead>
            <tbody>
              {byProperty.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.owner}</td>
                  <td className="py-2">{formatMoney(p.revenue)}</td>
                  <td className="py-2">{formatMoney(p.expense)}</td>
                  <td className={`py-2 font-medium ${p.noi < 0 ? "text-rose-700" : ""}`}>
                    {formatMoney(p.noi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`By owner · ${ALL_PERIODS_HINT}`}>
        <ul className="space-y-2 text-sm">
          {[...ownerMap.values()].map((o) => (
            <li key={o.name} className="flex justify-between border-b border-slate-50 py-2">
              <span>{o.name}</span>
              <span>NOI {formatMoney(o.revenue - o.expense)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
