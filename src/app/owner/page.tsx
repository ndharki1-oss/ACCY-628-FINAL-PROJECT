import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card, Stat } from "@/components/ui";
import { PropertyLink } from "@/components/property-link";
import { formatMoney } from "@/lib/utils";
import { ownerApproveCost } from "@/app/actions/business";
import Link from "next/link";

const emptyId = "00000000-0000-0000-0000-000000000000";

export default async function OwnerDashboard() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, owner, error: ownerError } = await getLinkedOwnerId(
    supabase,
    user
  );

  if (!ownerId) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Owner dashboard
        </h1>
        <p className="text-sm text-rose-700">
          {ownerError ?? "This login is not linked to an owner record."}
        </p>
      </div>
    );
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address_line1, city, state, square_feet")
    .eq("owner_id", ownerId)
    .order("name");

  const propIds = (properties ?? []).map((p) => p.id);
  const propFilter = propIds.length ? propIds : [emptyId];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const inDays = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const [
    { data: agreements },
    { data: units },
    { data: leases },
    { data: invoices },
    { data: costs },
    { data: statements },
    { data: deposits },
    { data: deniedApprovals },
  ] = await Promise.all([
    supabase
      .from("management_agreements")
      .select("property_id, approval_threshold, fee_percent")
      .eq("owner_id", ownerId),
    supabase
      .from("units")
      .select("id, property_id, unit_code, square_feet")
      .in("property_id", propFilter),
    supabase
      .from("leases")
      .select(
        "id, property_id, unit_id, lease_number, status, start_date, end_date, base_rent_monthly, cam_monthly, tenants(company_name, contact_name)"
      )
      .in("property_id", propFilter),
    supabase
      .from("invoices")
      .select(
        "id, tenant_id, lease_id, property_id, status, total, amount_paid, period_start, period_end, due_date, issue_date"
      )
      .eq("party_type", "tenant")
      .in("property_id", propFilter),
    supabase
      .from("cost_entries")
      .select("id, property_id, description, amount, category, incurred_date, owner_approved")
      .eq("owner_id", ownerId),
    supabase
      .from("owner_statements")
      .select(
        "id, property_id, statement_number, remittance_due, status, period_start, period_end, total_collections, issued_at, properties(name)"
      )
      .eq("owner_id", ownerId)
      .order("period_end", { ascending: false }),
    supabase
      .from("security_deposits")
      .select("id, amount, status, property_id")
      .in("property_id", propFilter)
      .eq("status", "held"),
    supabase
      .from("approvals")
      .select("entity_id, status")
      .eq("entity_type", "cost_entry")
      .eq("status", "rejected"),
  ]);

  const thresholdByProperty = new Map(
    (agreements ?? []).map((a) => [a.property_id, Number(a.approval_threshold)])
  );
  const deniedCostIds = new Set((deniedApprovals ?? []).map((a) => a.entity_id));
  const propertyName = (id: string) =>
    (properties ?? []).find((p) => p.id === id)?.name ?? "Property";

  const tenantInvoices = (invoices ?? []).filter((i) => i.status !== "void");
  const currentInvoices = tenantInvoices.filter((i) => {
    const start = i.period_start ?? i.issue_date;
    const end = i.period_end ?? i.due_date;
    if (!start || !end) return false;
    return start <= monthEnd && end >= monthStart;
  });
  const billed = currentInvoices.reduce((s, i) => s + Number(i.total), 0);
  const collected = currentInvoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
  const delinquentTenants = new Set(
    tenantInvoices.filter((i) => i.status === "overdue").map((i) => i.tenant_id)
  );

  const currentCosts = (costs ?? []).filter(
    (c) => c.incurred_date >= monthStart && c.incurred_date <= monthEnd
  );
  const portfolioIncome = tenantInvoices.reduce((s, i) => s + Number(i.total), 0);
  const portfolioExpense = (costs ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const monthIncome = currentInvoices.reduce((s, i) => s + Number(i.total), 0);
  const monthExpense = currentCosts.reduce((s, c) => s + Number(c.amount), 0);

  const thisMonthStatements = (statements ?? []).filter(
    (s) => s.period_start <= monthEnd && s.period_end >= monthStart
  );
  const remittanceDue = thisMonthStatements.length
    ? thisMonthStatements.reduce((s, st) => s + Number(st.remittance_due), 0)
    : Number(statements?.[0]?.remittance_due ?? 0);
  const remittanceStatement = thisMonthStatements[0] ?? statements?.[0];
  const pastDistributions = (statements ?? [])
    .filter((s) => s.id !== remittanceStatement?.id)
    .slice(0, 4);

  const activeLeases = (leases ?? []).filter((l) => l.status === "active");
  const leasedUnitIds = new Set(activeLeases.map((l) => l.unit_id).filter(Boolean));
  const occupancyPct =
    (units ?? []).length > 0
      ? Math.round((leasedUnitIds.size / (units ?? []).length) * 100)
      : 0;
  const vacantUnits = (units ?? []).filter((u) => !leasedUnitIds.has(u.id));

  const noiByProperty = (properties ?? [])
    .map((p) => {
      const income = tenantInvoices
        .filter((i) => i.property_id === p.id)
        .reduce((s, i) => s + Number(i.total), 0);
      const expense = (costs ?? [])
        .filter((c) => c.property_id === p.id)
        .reduce((s, c) => s + Number(c.amount), 0);
      const propUnits = (units ?? []).filter((u) => u.property_id === p.id);
      const occupied = propUnits.filter((u) => leasedUnitIds.has(u.id)).length;
      return {
        ...p,
        income,
        expense,
        noi: income - expense,
        occupied,
        unitCount: propUnits.length,
        vacant: propUnits.length - occupied,
      };
    })
    .sort((a, b) => b.noi - a.noi);

  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const noiTrend = monthKeys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const start = `${key}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);
    const income = tenantInvoices
      .filter((i) => {
        const period = i.period_end ?? i.due_date ?? i.issue_date;
        return period >= start && period <= end;
      })
      .reduce((s, i) => s + Number(i.total), 0);
    const expense = (costs ?? [])
      .filter((c) => c.incurred_date >= start && c.incurred_date <= end)
      .reduce((s, c) => s + Number(c.amount), 0);
    return { key, label: new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" }), noi: income - expense };
  });

  const awaitingCosts = (costs ?? []).filter((c) => {
    if (c.owner_approved || deniedCostIds.has(c.id)) return false;
    const threshold = thresholdByProperty.get(c.property_id) ?? 2500;
    return Number(c.amount) > threshold;
  });

  const expiringLeases = activeLeases
    .concat((leases ?? []).filter((l) => l.status === "renewal_pending"))
    .filter((l) => l.end_date && l.end_date <= inDays(90))
    .sort((a, b) => a.end_date.localeCompare(b.end_date));

  const windowLabel = (endDate: string) => {
    if (endDate <= inDays(30)) return "30 days";
    if (endDate <= inDays(60)) return "60 days";
    return "90 days";
  };

  const trustHeld = (deposits ?? []).reduce((s, d) => s + Number(d.amount), 0);

  const standingForLease = (leaseId: string) => {
    const rows = tenantInvoices.filter((i) => i.lease_id === leaseId);
    if (rows.some((i) => i.status === "overdue")) return "overdue";
    if (rows.some((i) => i.status === "disputed")) return "disputed";
    if (rows.some((i) => i.status === "partial")) return "partial";
    if (rows.some((i) => ["sent"].includes(i.status))) return "sent";
    if (rows.length === 0) return "current";
    if (rows.every((i) => i.status === "paid" || i.status === "void")) return "paid";
    return rows[0]?.status ?? "current";
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e] sm:text-4xl">
          Owner dashboard
        </h1>
        <p className="max-w-2xl text-slate-600">
          {owner?.company_name
            ? `Overview for ${owner.company_name}.`
            : "Overview of your properties."}{" "}
          Only your portfolio is shown.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Glance
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Remittance due"
            value={formatMoney(remittanceDue)}
            hint={
              remittanceStatement
                ? `${remittanceStatement.statement_number} · ${remittanceStatement.period_start} to ${remittanceStatement.period_end}`
                : "No statement issued yet"
            }
          />
          <Stat
            label="Portfolio NOI"
            value={formatMoney(portfolioIncome - portfolioExpense)}
            hint={`This month ${formatMoney(monthIncome - monthExpense)}`}
          />
          <Stat
            label="Occupancy"
            value={`${occupancyPct}%`}
            hint={`${leasedUnitIds.size} leased · ${vacantUnits.length} vacant`}
          />
          <Stat
            label="Collection rate"
            value={`${collectionRate}%`}
            hint={`${formatMoney(collected)} collected of ${formatMoney(billed)} billed`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Attention
        </h2>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="Action needed"
            action={
              <Link href="/owner/approvals" className="text-sm text-[#c4784a]">
                All approvals →
              </Link>
            }
          >
            <p className="mb-5 text-sm leading-relaxed text-slate-600">
              Expenditures above your management-agreement threshold. Approve or deny
              before they hit your statement.
            </p>
            {awaitingCosts.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing is waiting on you.</p>
            ) : (
              <ul className="space-y-5">
                {awaitingCosts.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-[#0c1f2e]">{c.description}</p>
                        <p className="text-sm text-slate-600">
                          <PropertyLink
                            id={c.property_id}
                            className="text-slate-700 hover:text-[#c4784a] hover:underline"
                          >
                            {propertyName(c.property_id)}
                          </PropertyLink>{" "}
                          · {c.category} · {c.incurred_date}
                        </p>
                        <p className="text-xs text-slate-500">
                          Threshold {formatMoney(thresholdByProperty.get(c.property_id) ?? 2500)}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-[#0c1f2e]">
                        {formatMoney(c.amount)}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={ownerApproveCost}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button
                          type="submit"
                          className="rounded bg-emerald-700 px-3 py-2 text-sm text-white"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={ownerApproveCost} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decision" value="deny" />
                        <input
                          name="reason"
                          placeholder="Denial reason"
                          className="rounded border border-slate-300 px-3 py-2 text-sm"
                          required
                        />
                        <button
                          type="submit"
                          className="rounded bg-rose-700 px-3 py-2 text-sm text-white"
                        >
                          Deny
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming lease expirations">
            <p className="mb-5 text-sm leading-relaxed text-slate-600">
              Active and renewal-pending leases ending in the next 30 / 60 / 90 days.
            </p>
            {expiringLeases.length === 0 ? (
              <p className="text-sm text-slate-600">No expirations in the next 90 days.</p>
            ) : (
              <ul className="space-y-4">
                {expiringLeases.map((l) => {
                  const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
                  return (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-[#0c1f2e]">
                          {tenant?.company_name ?? "Tenant"} · {l.lease_number}
                        </p>
                        <p className="text-sm text-slate-600">
                          <PropertyLink
                            id={l.property_id}
                            className="text-slate-700 hover:text-[#c4784a] hover:underline"
                          >
                            {propertyName(l.property_id)}
                          </PropertyLink>{" "}
                          · ends {l.end_date}
                        </p>
                      </div>
                      <Badge status={windowLabel(l.end_date)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Portfolio detail
        </h2>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="Remittance & recent distributions"
            action={
              remittanceStatement ? (
                <Link href="/owner/statements" className="text-sm text-[#c4784a]">
                  Itemized statement →
                </Link>
              ) : null
            }
          >
            <div className="mb-6 rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                This period net to owner
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
                {formatMoney(remittanceDue)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {remittanceStatement
                  ? `${remittanceStatement.statement_number} · collections ${formatMoney(remittanceStatement.total_collections)}`
                  : "Harborline has not issued a statement for this month yet. Showing the latest available remittance."}
              </p>
            </div>
            <h3 className="mb-3 text-sm font-medium text-slate-700">Recent distributions</h3>
            {pastDistributions.length === 0 ? (
              <p className="text-sm text-slate-600">No earlier statements on file.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {pastDistributions.map((s) => {
                  const prop = Array.isArray(s.properties) ? s.properties[0] : s.properties;
                  return (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span className="text-slate-600">
                        {s.statement_number} ·{" "}
                        {s.property_id && prop?.name ? (
                          <PropertyLink
                            id={s.property_id}
                            className="text-slate-700 hover:text-[#c4784a] hover:underline"
                          >
                            {prop.name}
                          </PropertyLink>
                        ) : (
                          prop?.name ?? "Portfolio"
                        )}{" "}
                        · {s.period_end}
                      </span>
                      <span className="font-medium">{formatMoney(s.remittance_due)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Funds held in trust">
            <p className="mb-4 text-sm leading-relaxed text-slate-600">
              Security deposits currently held in escrow for your properties. This is
              tenant money held by the manager, not Harborline revenue and not a
              separate owner reserve account.
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
              {formatMoney(trustHeld)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {(deposits ?? []).length} held deposit
              {(deposits ?? []).length === 1 ? "" : "s"}
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <Card title="NOI by property">
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Income uses tenant invoice totals (`invoices.total`, excluding void).
            Expenses use `cost_entries.amount` on your owner record.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Property</th>
                  <th className="py-3 pr-4 font-medium">Income</th>
                  <th className="py-3 pr-4 font-medium">Expenses</th>
                  <th className="py-3 pr-4 font-medium">NOI</th>
                  <th className="py-3 font-medium">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {noiByProperty.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-4 pr-4">
                      <PropertyLink id={p.id}>{p.name}</PropertyLink>
                      <p className="text-xs text-slate-500">
                        {p.address_line1}, {p.city}, {p.state}
                      </p>
                    </td>
                    <td className="py-4 pr-4">{formatMoney(p.income)}</td>
                    <td className="py-4 pr-4">{formatMoney(p.expense)}</td>
                    <td className={`py-4 pr-4 font-semibold ${p.noi < 0 ? "text-rose-700" : ""}`}>
                      {formatMoney(p.noi)}
                    </td>
                    <td className="py-4">
                      {p.unitCount ? `${Math.round((p.occupied / p.unitCount) * 100)}%` : "—"}
                      {p.vacant > 0 ? (
                        <span className="ml-2 text-xs text-rose-700">{p.vacant} vacant</span>
                      ) : (
                        <span className="ml-2 text-xs text-emerald-700">fully leased</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-medium text-slate-700">Recent monthly NOI</h3>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {noiTrend.map((m) => (
                <div key={m.key} className="rounded-lg border border-slate-200 px-3 py-3">
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className={`mt-1 text-sm font-semibold ${m.noi < 0 ? "text-rose-700" : "text-[#0c1f2e]"}`}>
                    {formatMoney(m.noi)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Vacant units">
            {vacantUnits.length === 0 ? (
              <p className="text-sm text-slate-600">No vacant units in your portfolio.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {vacantUnits.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/70 px-4 py-3"
                  >
                    <span>
                      <PropertyLink
                        id={u.property_id}
                        className="text-slate-700 hover:text-[#c4784a] hover:underline"
                      >
                        {propertyName(u.property_id)}
                      </PropertyLink>{" "}
                      · {u.unit_code}
                    </span>
                    <span className="text-rose-800">Vacant</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Rent collection this period">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Billed</p>
                <p className="mt-1 text-xl font-semibold">{formatMoney(billed)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Collected</p>
                <p className="mt-1 text-xl font-semibold">{formatMoney(collected)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {delinquentTenants.size} delinquent tenant
              {delinquentTenants.size === 1 ? "" : "s"} with overdue invoices.
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4 pb-4">
        <Card title="Rent roll">
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Tenants on your properties, lease terms, and current invoice standing.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Property / lease</th>
                  <th className="py-3 pr-4 font-medium">Term</th>
                  <th className="py-3 pr-4 font-medium">Monthly rent</th>
                  <th className="py-3 font-medium">Standing</th>
                </tr>
              </thead>
              <tbody>
                {(leases ?? [])
                  .filter((l) => ["active", "renewal_pending"].includes(l.status))
                  .map((l) => {
                    const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
                    const standing = standingForLease(l.id);
                    return (
                      <tr key={l.id} className="border-b border-slate-100">
                        <td className="py-4 pr-4">
                          <p className="font-medium text-[#0c1f2e]">
                            {tenant?.company_name ?? "Tenant"}
                          </p>
                          <p className="text-xs text-slate-500">{tenant?.contact_name}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <PropertyLink id={l.property_id}>
                            {propertyName(l.property_id)}
                          </PropertyLink>
                          <p className="text-xs text-slate-500">{l.lease_number}</p>
                        </td>
                        <td className="py-4 pr-4 text-slate-600">
                          {l.start_date} → {l.end_date}
                        </td>
                        <td className="py-4 pr-4">
                          {formatMoney(Number(l.base_rent_monthly) + Number(l.cam_monthly))}
                          <p className="text-xs text-slate-500">
                            rent {formatMoney(l.base_rent_monthly)} + CAM {formatMoney(l.cam_monthly)}
                          </p>
                        </td>
                        <td className="py-4">
                          <Badge status={standing} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
