import { requireRole } from "@/lib/auth";
import { Card, Stat } from "@/components/ui";
import {
  AdminPropertiesTable,
  type AdminPropertyRow,
} from "@/components/admin-properties-table";
import { firstRelation } from "@/lib/work-order-routing";
import {
  formatOccupancyPercent,
  isOccupiedLeaseStatus,
  occupancyRate,
} from "@/lib/property-portfolio";

export default async function AdminPropertiesPage() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: properties }, { data: units }, { data: leases }] =
    await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, name, address_line1, city, state, postal_code, property_type, status, owners(company_name), management_agreements(fee_percent, approval_threshold, status)"
        )
        .order("name"),
      supabase.from("units").select("id, property_id"),
      supabase.from("leases").select("property_id, unit_id, status"),
    ]);

  const unitsByProperty = new Map<string, number>();
  for (const unit of units ?? []) {
    unitsByProperty.set(
      unit.property_id,
      (unitsByProperty.get(unit.property_id) ?? 0) + 1
    );
  }

  const occupiedUnitsByProperty = new Map<string, Set<string>>();
  for (const lease of leases ?? []) {
    if (!lease.unit_id || !isOccupiedLeaseStatus(lease.status)) continue;
    const set =
      occupiedUnitsByProperty.get(lease.property_id) ?? new Set<string>();
    set.add(lease.unit_id);
    occupiedUnitsByProperty.set(lease.property_id, set);
  }

  const rows: AdminPropertyRow[] = (properties ?? []).map((property) => {
    const owner = firstRelation(property.owners);
    const agreement = firstRelation(property.management_agreements);
    const unitCount = unitsByProperty.get(property.id) ?? 0;
    const occupiedCount = occupiedUnitsByProperty.get(property.id)?.size ?? 0;

    return {
      id: property.id,
      name: property.name,
      address: `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}`,
      owner: owner?.company_name ?? "—",
      type: property.property_type,
      unitCount,
      occupancyRate: occupancyRate(unitCount, occupiedCount),
      feePercent: agreement?.fee_percent ?? null,
      approvalThreshold: agreement?.approval_threshold ?? null,
      status: property.status,
    };
  });

  const propertyCount = rows.length;
  const totalUnits = rows.reduce((sum, row) => sum + row.unitCount, 0);
  const occupiedUnits = [...occupiedUnitsByProperty.values()].reduce(
    (sum, set) => sum + set.size,
    0
  );
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const portfolioOccupancy = occupancyRate(totalUnits, occupiedUnits);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          Properties
        </h1>
        <p className="mt-1 text-slate-600">
          Buildings, addresses, units, and occupancy across the portfolio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Properties" value={String(propertyCount)} />
        <Stat
          label="Portfolio occupancy"
          value={formatOccupancyPercent(portfolioOccupancy)}
        />
        <Stat label="Vacant units" value={String(vacantUnits)} />
      </div>

      <Card title="Portfolio">
        <AdminPropertiesTable properties={rows} />
      </Card>
    </div>
  );
}
