import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
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
import { feePercentFromCreditAndRisk, formatFeePercent } from "@/lib/utils";

export default async function AdminPropertiesPage() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: properties }, { data: units }, { data: leases }] =
    await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, name, address_line1, city, state, postal_code, property_type, status, risk_tier, owners(company_name), management_agreements(fee_percent, approval_threshold, status)"
        )
        .order("name"),
      supabase.from("units").select("id, property_id"),
      supabase
        .from("leases")
        .select("property_id, unit_id, status, tenants(credit_rating)"),
    ]);

  const unitsByProperty = new Map<string, number>();
  for (const unit of units ?? []) {
    unitsByProperty.set(
      unit.property_id,
      (unitsByProperty.get(unit.property_id) ?? 0) + 1
    );
  }

  const occupiedUnitsByProperty = new Map<string, Set<string>>();
  const feeByProperty = new Map<string, number[]>();
  const riskByProperty = new Map<string, string>();
  for (const property of properties ?? []) {
    riskByProperty.set(property.id, property.risk_tier ?? "standard");
  }
  for (const lease of leases ?? []) {
    if (lease.unit_id && isOccupiedLeaseStatus(lease.status)) {
      const set =
        occupiedUnitsByProperty.get(lease.property_id) ?? new Set<string>();
      set.add(lease.unit_id);
      occupiedUnitsByProperty.set(lease.property_id, set);

      const tenant = firstRelation(lease.tenants);
      const pct = feePercentFromCreditAndRisk(
        tenant?.credit_rating,
        riskByProperty.get(lease.property_id)
      );
      const list = feeByProperty.get(lease.property_id) ?? [];
      list.push(pct);
      feeByProperty.set(lease.property_id, list);
    }
  }

  const rows: AdminPropertyRow[] = (properties ?? []).map((property) => {
    const owner = firstRelation(property.owners);
    const agreement = firstRelation(property.management_agreements);
    const unitCount = unitsByProperty.get(property.id) ?? 0;
    const occupiedCount = occupiedUnitsByProperty.get(property.id)?.size ?? 0;
    const fees = feeByProperty.get(property.id) ?? [];
    const minFee = fees.length ? Math.min(...fees) : null;
    const maxFee = fees.length ? Math.max(...fees) : null;
    const feeLabel =
      minFee != null && maxFee != null
        ? minFee === maxFee
          ? formatFeePercent(minFee)
          : `${formatFeePercent(minFee)}–${formatFeePercent(maxFee)}`
        : agreement?.fee_percent != null
          ? formatFeePercent(agreement.fee_percent)
          : "—";

    return {
      id: property.id,
      name: property.name,
      address: `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}`,
      owner: owner?.company_name ?? "—",
      type: property.property_type,
      unitCount,
      occupancyRate: occupancyRate(unitCount, occupiedCount),
      feePercent: agreement?.fee_percent ?? null,
      feeLabel,
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
      <PageHeading
        title="Properties"
        vital="Fee % column shows credit-based rates on active leases (4–12%). Agreement avg is a property-level reference only — statements bill by tenant credit."
      />

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
