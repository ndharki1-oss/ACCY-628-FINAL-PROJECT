import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { firstRelation } from "@/lib/work-order-routing";
import {
  formatOccupancyPercent,
  isOccupiedLeaseStatus,
  occupancyRate,
  unitOccupancyStatus,
} from "@/lib/property-portfolio";

const RELATED_TABS = [
  { href: "/admin/leases", label: "Leases" },
  { href: "/admin/work-orders", label: "Work Orders" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/profitability", label: "Profitability" },
  { href: "/admin/owners", label: "Property Owners" },
] as const;

function OverviewStat({
  label,
  value,
  hint,
  capitalize,
}: {
  label: string;
  value: string;
  hint?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-xl text-[#0c1f2e] ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole(["admin"]);

  const [
    { data: property },
    { data: units },
    { data: leases },
    { data: workOrders },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, name, address_line1, city, state, postal_code, property_type, status, owners(company_name, contact_name), management_agreements(approval_threshold, fee_percent)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("units")
      .select("id, unit_code, square_feet")
      .eq("property_id", id)
      .order("unit_code"),
    supabase
      .from("leases")
      .select("unit_id, status, tenants(company_name)")
      .eq("property_id", id)
      .in("status", ["active", "renewal_pending", "draft"]),
    supabase
      .from("work_orders")
      .select("unit_id, status")
      .eq("property_id", id)
      .in("status", ["open", "assigned", "in_progress"]),
  ]);

  if (!property) notFound();

  const owner = firstRelation(property.owners);
  const agreement = firstRelation(property.management_agreements);
  const ownerName =
    owner?.contact_name || owner?.company_name
      ? [owner.contact_name, owner.company_name].filter(Boolean).join(" · ")
      : "—";

  const leaseByUnit = new Map<
    string,
    { status: string; tenantName: string | null }
  >();
  for (const lease of leases ?? []) {
    if (!lease.unit_id) continue;
    const tenant = firstRelation(lease.tenants);
    const existing = leaseByUnit.get(lease.unit_id);
    const next = {
      status: lease.status,
      tenantName: tenant?.company_name ?? null,
    };
    if (!existing) {
      leaseByUnit.set(lease.unit_id, next);
      continue;
    }
    if (
      isOccupiedLeaseStatus(lease.status) &&
      !isOccupiedLeaseStatus(existing.status)
    ) {
      leaseByUnit.set(lease.unit_id, next);
    }
  }

  const maintenanceUnits = new Set(
    (workOrders ?? [])
      .map((wo) => wo.unit_id)
      .filter((unitId): unitId is string => Boolean(unitId))
  );

  const unitRows = (units ?? []).map((unit) => {
    const lease = leaseByUnit.get(unit.id);
    const occupancy = unitOccupancyStatus({
      leaseStatus: lease?.status,
      hasMaintenance: maintenanceUnits.has(unit.id),
    });
    return {
      id: unit.id,
      unitCode: unit.unit_code,
      squareFeet: unit.square_feet,
      tenantName:
        occupancy === "occupied" || occupancy === "reserved"
          ? lease?.tenantName ?? "—"
          : "—",
      occupancy,
    };
  });

  const unitCount = unitRows.length;
  const occupiedCount = unitRows.filter(
    (unit) => unit.occupancy === "occupied"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/properties" className="text-sm text-[#c4784a]">
          ← Properties
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
              {property.name}
            </h1>
            <p className="mt-1 text-slate-600">
              {property.address_line1}, {property.city}, {property.state}{" "}
              {property.postal_code}
            </p>
          </div>
          <Badge status={property.status} />
        </div>
      </div>

      <Card title="Overview">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewStat label="Type" value={property.property_type.replaceAll("_", " ")} capitalize />
          <OverviewStat label="Owner" value={ownerName} />
          <OverviewStat
            label="Occupancy"
            value={formatOccupancyPercent(occupancyRate(unitCount, occupiedCount))}
            hint={`${occupiedCount} of ${unitCount} units occupied`}
          />
          <OverviewStat
            label="Approval threshold"
            value={formatMoney(agreement?.approval_threshold ?? 2500)}
            hint="10% of current monthly base rent"
          />
        </div>
        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Address</dt>
            <dd className="mt-1 text-[#0c1f2e]">
              {property.address_line1}, {property.city}, {property.state}{" "}
              {property.postal_code}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Agreement fee avg
            </dt>
            <dd className="mt-1 text-[#0c1f2e]">
              {agreement?.fee_percent != null
                ? `${agreement.fee_percent}%`
                : "—"}
              <span className="mt-0.5 block text-xs text-slate-500">
                Reference only — billing uses tenant credit + risk
              </span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Units">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Unit / suite</th>
                <th className="py-2 pr-3">Sq ft</th>
                <th className="py-2 pr-3">Current tenant</th>
                <th className="py-2">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {unitRows.map((unit) => (
                <tr key={unit.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-medium text-[#0c1f2e]">
                    {unit.unitCode}
                  </td>
                  <td className="py-3 pr-3 text-[#0c1f2e]">
                    {unit.squareFeet?.toLocaleString() ?? "—"}
                  </td>
                  <td className="py-3 pr-3 text-[#0c1f2e]">{unit.tenantName}</td>
                  <td className="py-3">
                    <Badge status={unit.occupancy} />
                  </td>
                </tr>
              ))}
              {unitRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No units are on file for this property.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Related tabs">
        <p className="mb-4 text-sm text-slate-600">
          Leases, invoices, maintenance, profitability, and owner contacts stay on
          their own tabs.
        </p>
        <div className="flex flex-wrap gap-2">
          {RELATED_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="inline-flex rounded border border-[#0c1f2e]/20 px-3 py-1.5 text-sm font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
