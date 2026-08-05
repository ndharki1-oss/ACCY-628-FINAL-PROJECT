import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { feePercentFromCredit, formatFeePercent, formatMoney } from "@/lib/utils";

export default async function AdminPropertiesPage() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: properties }, { data: leases }] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, name, city, state, property_type, square_feet, status, owners(company_name), management_agreements(fee_percent, approval_threshold, status)"
      )
      .order("name"),
    supabase
      .from("leases")
      .select("property_id, status, tenants(credit_rating)")
      .in("status", ["active", "renewal_pending"]),
  ]);

  const feeByProperty = new Map<string, number[]>();
  for (const l of leases ?? []) {
    const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
    const pct = feePercentFromCredit(tenant?.credit_rating as string | undefined);
    const list = feeByProperty.get(l.property_id) ?? [];
    list.push(pct);
    feeByProperty.set(l.property_id, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Properties & management agreements
      </h1>
      <p className="text-slate-600">
        One management agreement per property. Harborline fee = credit-based % of
        collected rent (4–12%), set by each tenant&apos;s credit rating.
      </p>
      <Card title="Portfolio">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Property</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Fee % (credit-based)</th>
                <th className="py-2 pr-3">Approval $</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(properties ?? []).map((p) => {
                const ma = Array.isArray(p.management_agreements)
                  ? p.management_agreements[0]
                  : p.management_agreements;
                const owner = Array.isArray(p.owners) ? p.owners[0] : p.owners;
                const fees = feeByProperty.get(p.id) ?? [];
                const minFee = fees.length ? Math.min(...fees) : null;
                const maxFee = fees.length ? Math.max(...fees) : null;
                const feeLabel =
                  minFee != null && maxFee != null
                    ? minFee === maxFee
                      ? formatFeePercent(minFee)
                      : `${formatFeePercent(minFee)}–${formatFeePercent(maxFee)}`
                    : `${ma?.fee_percent ?? "—"}%`;
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.city}, {p.state}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{owner?.company_name ?? "—"}</td>
                    <td className="py-3 pr-3 capitalize">{p.property_type}</td>
                    <td className="py-3 pr-3">
                      <div>{feeLabel} of collected rent</div>
                      <div className="text-xs text-slate-500">
                        Agreement avg {ma?.fee_percent ?? "—"}%
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      {formatMoney(ma?.approval_threshold)}
                    </td>
                    <td className="py-3">
                      <Badge status={p.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
