import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function leaseBalance(
  leaseId: string,
  invoices: {
    lease_id: string | null;
    status: string;
    total: number | string;
    amount_paid: number | string;
  }[]
) {
  return invoices
    .filter((i) => i.lease_id === leaseId && i.status !== "void")
    .reduce((sum, i) => {
      const due = Number(i.total) - Number(i.amount_paid);
      return sum + Math.max(0, due);
    }, 0);
}

export default async function OwnerPropertiesPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  const { data: properties, error } = ownerId
    ? await supabase
        .from("properties")
        .select(
          "id, name, address_line1, city, state, management_agreements(fee_percent, approval_threshold)"
        )
        .eq("owner_id", ownerId)
        .order("name")
    : { data: [], error: ownerError ? { message: ownerError } : null };

  const propertyIds = (properties ?? []).map((p) => p.id);

  const [
    { data: units },
    { data: leases },
    { data: invoices },
    { data: costs },
    { data: workOrders },
    { data: requests },
    { data: deniedApprovals },
  ] =
    propertyIds.length > 0
      ? await Promise.all([
          supabase
            .from("units")
            .select("id, property_id, unit_code")
            .in("property_id", propertyIds)
            .order("unit_code"),
          supabase
            .from("leases")
            .select(
              "id, property_id, unit_id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, tenants(company_name, contact_name)"
            )
            .in("property_id", propertyIds)
            .in("status", ["active", "renewal_pending"])
            .order("lease_number"),
          supabase
            .from("invoices")
            .select("id, property_id, lease_id, tenant_id, status, total, amount_paid")
            .eq("party_type", "tenant")
            .in("property_id", propertyIds),
          supabase
            .from("cost_entries")
            .select("id, property_id, amount, incurred_date, owner_approved")
            .eq("owner_id", ownerId!)
            .in("property_id", propertyIds),
          supabase
            .from("work_orders")
            .select("id, property_id")
            .in("property_id", propertyIds)
            .eq("status", "pending_owner_approval"),
          supabase
            .from("tenant_requests")
            .select("id, property_id")
            .in("property_id", propertyIds)
            .eq("status", "open"),
          supabase
            .from("approvals")
            .select("entity_id")
            .eq("entity_type", "cost_entry")
            .eq("status", "rejected"),
        ])
      : [
          { data: null },
          { data: null },
          { data: null },
          { data: null },
          { data: null },
          { data: null },
          { data: null },
        ];

  const deniedCostIds = new Set((deniedApprovals ?? []).map((a) => a.entity_id));
  const unitsByProperty = new Map<string, NonNullable<typeof units>>();
  for (const u of units ?? []) {
    const list = unitsByProperty.get(u.property_id) ?? [];
    list.push(u);
    unitsByProperty.set(u.property_id, list);
  }

  const leasesByProperty = new Map<string, NonNullable<typeof leases>>();
  const leaseByUnitId = new Map<string, NonNullable<typeof leases>[number]>();
  for (const l of leases ?? []) {
    const list = leasesByProperty.get(l.property_id) ?? [];
    list.push(l);
    leasesByProperty.set(l.property_id, list);
    if (l.unit_id) leaseByUnitId.set(l.unit_id, l);
  }

  const tenantInvoices = (invoices ?? []).filter((i) => i.status !== "void");

  type Metrics = {
    occupancyPct: number;
    monthlyRent: number;
    overdueAmount: number;
    noiYtd: number;
    actionCount: number;
  };

  const metricsByProperty = new Map<string, Metrics>();

  for (const p of properties ?? []) {
    const propLeases = leasesByProperty.get(p.id) ?? [];
    const propUnits = unitsByProperty.get(p.id) ?? [];
    const leasedUnits = new Set(propLeases.map((l) => l.unit_id).filter(Boolean));
    const occupancyPct =
      propUnits.length > 0
        ? Math.round((leasedUnits.size / propUnits.length) * 100)
        : 0;
    const monthlyRent = propLeases.reduce(
      (s, l) => s + Number(l.base_rent_monthly) + Number(l.cam_monthly),
      0
    );

    const propInvoices = tenantInvoices.filter((i) => i.property_id === p.id);
    const overdueAmount = propInvoices
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + Math.max(0, Number(i.total) - Number(i.amount_paid)), 0);
    const revenue = propInvoices.reduce((s, i) => s + Number(i.total), 0);

    const propCosts = (costs ?? []).filter((c) => c.property_id === p.id);
    const expenseAll = propCosts.reduce((s, c) => s + Number(c.amount), 0);

    const ma = firstRel(p.management_agreements);
    const threshold = Number(ma?.approval_threshold ?? 2500);
    const awaitingCosts = propCosts.filter((c) => {
      if (c.owner_approved || deniedCostIds.has(c.id)) return false;
      return Number(c.amount) > threshold;
    }).length;
    const woCount = (workOrders ?? []).filter((w) => w.property_id === p.id).length;
    const reqCount = (requests ?? []).filter((r) => r.property_id === p.id).length;

    metricsByProperty.set(p.id, {
      occupancyPct,
      monthlyRent,
      overdueAmount,
      noiYtd: revenue - expenseAll,
      actionCount: awaitingCosts + woCount + reqCount,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Your properties
      </h1>
      {error ? (
        <p className="text-sm text-rose-700">{error.message}</p>
      ) : (properties ?? []).length === 0 ? (
        <p className="text-sm text-slate-600">No properties are linked to this owner yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(properties ?? []).map((p) => {
            const m = metricsByProperty.get(p.id)!;
            const propUnits = unitsByProperty.get(p.id) ?? [];

            return (
              <Card
                key={p.id}
                title={p.name}
                className="h-full"
                action={
                  m.actionCount > 0 ? (
                    <Link
                      href={`/owner/properties/${p.id}#actions`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-600 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                      title="Open pending actions for this property"
                    >
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 tabular-nums">
                        {m.actionCount}
                      </span>
                      {m.actionCount === 1 ? "action" : "actions"}
                    </Link>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      No actions
                    </span>
                  )
                }
              >
                <p className="text-sm text-slate-600">
                  {p.address_line1}, {p.city}, {p.state}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Occupancy
                    </p>
                    <p className="mt-0.5 font-semibold text-[#0c1f2e]">{m.occupancyPct}%</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      In-place rent
                    </p>
                    <p className="mt-0.5 font-semibold text-[#0c1f2e]">
                      {formatMoney(m.monthlyRent)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Overdue
                    </p>
                    <p
                      className={`mt-0.5 font-semibold ${
                        m.overdueAmount > 0 ? "text-rose-700" : "text-[#0c1f2e]"
                      }`}
                    >
                      {formatMoney(m.overdueAmount)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      NOI
                    </p>
                    <p
                      className={`mt-0.5 font-semibold ${
                        m.noiYtd < 0 ? "text-rose-700" : "text-[#0c1f2e]"
                      }`}
                    >
                      {formatMoney(m.noiYtd)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Suites
                  </p>
                  {propUnits.length === 0 ? (
                    <p className="text-sm text-slate-600">No suites recorded.</p>
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {propUnits.map((unit) => {
                        const lease = leaseByUnitId.get(unit.id);
                        const tenant = firstRel(lease?.tenants);
                        const vacant = !lease;
                        const balance = lease
                          ? leaseBalance(lease.id, tenantInvoices)
                          : 0;
                        const monthly = lease
                          ? Number(lease.base_rent_monthly) + Number(lease.cam_monthly)
                          : 0;
                        return (
                          <div
                            key={unit.id}
                            className={`flex w-40 shrink-0 flex-col rounded-lg border px-3 py-3 text-sm ${
                              vacant
                                ? "border-dashed border-slate-300 bg-slate-50/70"
                                : "border-slate-200 bg-white/70"
                            }`}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Suite {unit.unit_code}
                            </p>
                            {vacant ? (
                              <p className="mt-3 flex-1 font-[family-name:var(--font-display)] text-lg text-slate-400">
                                Vacant
                              </p>
                            ) : (
                              <div className="mt-2 flex flex-1 flex-col gap-2">
                                <p className="font-medium leading-snug text-[#0c1f2e]">
                                  {tenant?.company_name ??
                                    tenant?.contact_name ??
                                    "Tenant"}
                                </p>
                                {tenant?.contact_name && tenant?.company_name ? (
                                  <p className="text-xs text-slate-500">
                                    {tenant.contact_name}
                                  </p>
                                ) : null}
                                <Badge status={lease.status} />
                                <p className="text-xs leading-relaxed text-slate-600">
                                  {lease.lease_type.replaceAll("_", " ")}
                                  <br />
                                  Ends {lease.end_date ?? "open"}
                                </p>
                                <p className="mt-auto text-xs text-slate-600">
                                  {formatMoney(monthly)}/mo
                                  <br />
                                  Bal{" "}
                                  <span
                                    className={
                                      balance > 0
                                        ? "font-medium text-rose-700"
                                        : "font-medium text-[#0c1f2e]"
                                    }
                                  >
                                    {formatMoney(balance)}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
                  <Link
                    href={`/owner/properties/${p.id}`}
                    className="text-sm font-medium text-[#c4784a] transition hover:text-[#a86238] hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
