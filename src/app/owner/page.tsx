import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Stat } from "@/components/ui";
import { PropertyLink } from "@/components/property-link";
import { DashboardSection } from "@/components/owner/dashboard-section";
import {
  NoiTrendChart,
  type NoiMonthPoint,
  type NoiPropertySeries,
} from "@/components/owner/noi-trend-chart";
import { formatMoney } from "@/lib/utils";
import { ownerApproveCost } from "@/app/actions/business";
import Link from "next/link";

const emptyId = "00000000-0000-0000-0000-000000000000";

function formatPeriodLabel(start: string, end: string) {
  const endDate = new Date(`${end}T00:00:00Z`);
  const monthYear = endDate.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${start} → ${end} · ${monthYear}`;
}

function expirationWindow(
  endDate: string,
  within12: string,
  within18: string
) {
  if (endDate <= within12)
    return { label: "12 months", className: "bg-rose-100 text-rose-800" };
  if (endDate <= within18)
    return { label: "18 months", className: "bg-amber-100 text-amber-900" };
  return { label: "24 months", className: "bg-slate-200 text-slate-800" };
}

export default async function OwnerDashboard() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

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
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const inMonths = (months: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
    return d.toISOString().slice(0, 10);
  };
  const within12 = inMonths(12);
  const within18 = inMonths(18);
  const horizonEnd = inMonths(24);

  const [
    { data: agreements },
    { data: units },
    { data: leases },
    { data: invoices },
    { data: costs },
    { data: statements },
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
        "id, tenant_id, lease_id, property_id, status, total, amount_paid, period_start, period_end, due_date, issue_date, tenants(company_name)"
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
        "id, property_id, remittance_due, status, period_start, period_end, total_collections, issued_at, properties(name)"
      )
      .eq("owner_id", ownerId)
      .order("period_end", { ascending: false }),
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

  const overdueInvoices = tenantInvoices
    .filter((i) => i.status === "overdue")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

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
    .slice(0, 6);

  const activeLeases = (leases ?? []).filter((l) => l.status === "active");
  const leasedUnitIds = new Set(activeLeases.map((l) => l.unit_id).filter(Boolean));
  const occupancyPct =
    (units ?? []).length > 0
      ? Math.round((leasedUnitIds.size / (units ?? []).length) * 100)
      : 0;
  const vacantUnits = (units ?? []).filter((u) => !leasedUnitIds.has(u.id));

  const monthKeys: string[] = [];
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const buildMonths = (propertyId?: string): NoiMonthPoint[] =>
    monthKeys.map((key) => {
      const [year, month] = key.split("-").map(Number);
      const start = `${key}-01`;
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      const income = tenantInvoices
        .filter((i) => {
          if (propertyId && i.property_id !== propertyId) return false;
          const period = i.period_end ?? i.due_date ?? i.issue_date;
          return period >= start && period <= end;
        })
        .reduce((s, i) => s + Number(i.total), 0);
      const expense = (costs ?? [])
        .filter((c) => {
          if (propertyId && c.property_id !== propertyId) return false;
          return c.incurred_date >= start && c.incurred_date <= end;
        })
        .reduce((s, c) => s + Number(c.amount), 0);
      return {
        key,
        label: new Date(year, month - 1, 1).toLocaleString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        income,
        expense,
        noi: income - expense,
      };
    });

  const portfolioNoi: NoiMonthPoint[] = buildMonths();
  const noiByPropertySeries: NoiPropertySeries[] = (properties ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    months: buildMonths(p.id),
  }));

  const awaitingCosts = (costs ?? []).filter((c) => {
    if (c.owner_approved || deniedCostIds.has(c.id)) return false;
    const threshold = thresholdByProperty.get(c.property_id) ?? 2500;
    return Number(c.amount) > threshold;
  });

  const expiringLeases = activeLeases
    .concat((leases ?? []).filter((l) => l.status === "renewal_pending"))
    .filter((l) => l.end_date && l.end_date >= today && l.end_date <= horizonEnd)
    .sort((a, b) => a.end_date.localeCompare(b.end_date));

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

  const rentRoll = (leases ?? [])
    .filter((l) => ["active", "renewal_pending"].includes(l.status))
    .map((l) => {
      const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
      const standing = standingForLease(l.id);
      return {
        id: l.id,
        tenantName: tenant?.company_name ?? "Tenant",
        contactName: tenant?.contact_name as string | undefined,
        propertyId: l.property_id,
        monthly: Number(l.base_rent_monthly) + Number(l.cam_monthly),
        standing,
        endDate: l.end_date as string,
      };
    })
    .sort((a, b) => {
      const rank = (s: string) => (s === "overdue" ? 0 : s === "partial" ? 1 : 2);
      const d = rank(a.standing) - rank(b.standing);
      if (d !== 0) return d;
      return a.tenantName.localeCompare(b.tenantName);
    });

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e] sm:text-4xl">
        Owner dashboard
      </h1>

      <section className="space-y-4">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Remittance due"
            value={formatMoney(remittanceDue)}
            hint={
              remittanceStatement
                ? formatPeriodLabel(
                    remittanceStatement.period_start,
                    remittanceStatement.period_end
                  )
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
            hint={`${formatMoney(collected)} of ${formatMoney(billed)} billed`}
          />
        </div>
      </section>

      <div className="space-y-4">
        <DashboardSection
          title="Action needed"
          accent="amber"
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
                <li key={c.id} className="rounded-lg border border-amber-200/80 bg-white/80 p-4">
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
                        Threshold{" "}
                        {formatMoney(thresholdByProperty.get(c.property_id) ?? 2500)}
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
        </DashboardSection>

        <DashboardSection title="Upcoming lease expirations" accent="slate">
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            Active and renewal-pending leases ending within 12, 18, or 24 months.
          </p>
          {expiringLeases.length === 0 ? (
            <p className="text-sm text-slate-600">
              No expirations in the next 24 months.
            </p>
          ) : (
            <ul className="space-y-4">
              {expiringLeases.map((l) => {
                const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
                const window = expirationWindow(l.end_date, within12, within18);
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-[#0c1f2e]">
                        {tenant?.company_name ?? "Tenant"}
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
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${window.className}`}
                    >
                      {window.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection
          title="Remittance & recent distributions"
          accent="emerald"
          action={
            <Link href="/owner/statements" className="text-sm text-[#c4784a]">
              Full statements →
            </Link>
          }
        >
          <div className="mb-6 rounded-lg border border-emerald-100 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-800/70">
              This period net to owner
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
              {formatMoney(remittanceDue)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {remittanceStatement
                ? `${formatPeriodLabel(remittanceStatement.period_start, remittanceStatement.period_end)} · collections ${formatMoney(remittanceStatement.total_collections)}`
                : "No statement for this month yet. Showing the latest remittance."}
            </p>
          </div>
          <h3 className="mb-3 text-sm font-medium text-slate-700">
            Recent distributions
          </h3>
          {pastDistributions.length === 0 ? (
            <p className="text-sm text-slate-600">No earlier statements on file.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {pastDistributions.map((s) => {
                const prop = Array.isArray(s.properties) ? s.properties[0] : s.properties;
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 border-b border-emerald-100/80 pb-2 last:border-0"
                  >
                    <span className="text-slate-600">
                      {s.property_id && prop?.name ? (
                        <PropertyLink
                          id={s.property_id}
                          className="text-slate-700 hover:text-[#c4784a] hover:underline"
                        >
                          {prop.name}
                        </PropertyLink>
                      ) : (
                        (prop?.name ?? "Portfolio")
                      )}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {formatPeriodLabel(s.period_start, s.period_end)}
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(s.remittance_due)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection title="NOI over time" accent="teal">
          <NoiTrendChart
            portfolio={portfolioNoi}
            byProperty={noiByPropertySeries}
          />
        </DashboardSection>

        <DashboardSection title="Rent & collections" accent="rose">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-rose-100 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Billed this month
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoney(billed)}
              </p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Collected
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoney(collected)}
              </p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Overdue invoices
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-rose-800">
                {overdueInvoices.length}
              </p>
            </div>
          </div>

          {overdueInvoices.length > 0 ? (
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-medium text-rose-900">
                Needs attention — overdue
              </h3>
              <ul className="space-y-3">
                {overdueInvoices.map((inv) => {
                  const tenant = Array.isArray(inv.tenants)
                    ? inv.tenants[0]
                    : inv.tenants;
                  const balance = Number(inv.total) - Number(inv.amount_paid);
                  return (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-[#0c1f2e]">
                          {tenant?.company_name ?? "Tenant"}
                        </p>
                        <p className="text-slate-600">
                          <PropertyLink
                            id={inv.property_id}
                            className="text-slate-700 hover:text-[#c4784a] hover:underline"
                          >
                            {propertyName(inv.property_id)}
                          </PropertyLink>
                          {" · due "}
                          {inv.due_date}
                          {inv.period_start && inv.period_end
                            ? ` · ${inv.period_start} → ${inv.period_end}`
                            : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-rose-900">
                          {formatMoney(balance)}
                        </p>
                        <Badge status="overdue" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="mb-6 text-sm text-slate-600">No overdue rent right now.</p>
          )}

          <h3 className="mb-3 text-sm font-medium text-slate-700">Rent roll</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Property</th>
                  <th className="py-3 pr-4 font-medium">Monthly</th>
                  <th className="py-3 font-medium">Standing</th>
                </tr>
              </thead>
              <tbody>
                {rentRoll.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#0c1f2e]">{r.tenantName}</p>
                      {r.contactName ? (
                        <p className="text-xs text-slate-500">{r.contactName}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <PropertyLink id={r.propertyId}>
                        {propertyName(r.propertyId)}
                      </PropertyLink>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatMoney(r.monthly)}
                    </td>
                    <td className="py-3">
                      <Badge status={r.standing} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardSection>

        <DashboardSection title="Vacancies" accent="vacant">
          <p className="mb-4 text-sm text-slate-600">
            Informational only. Vacant units move into Action needed once leasing
            interest is tracked (coming later).
          </p>
          {vacantUnits.length === 0 ? (
            <p className="text-sm text-slate-600">No vacant units in your portfolio.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {vacantUnits.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-4 py-3"
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
                  <span className="text-slate-500">Vacant</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
