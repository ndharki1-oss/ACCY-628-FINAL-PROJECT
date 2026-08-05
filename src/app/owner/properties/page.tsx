import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { feePercentFromCredit, formatFeePercent, formatMoney } from "@/lib/utils";

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
  const { data: leases } =
    propertyIds.length > 0
      ? await supabase
          .from("leases")
          .select("property_id, status, tenants(credit_rating)")
          .in("property_id", propertyIds)
          .in("status", ["active", "renewal_pending"])
      : { data: [] };

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
        Your properties
      </h1>
      <p className="text-slate-600">
        Harborline&apos;s fee is a credit-based % of rent collected (4–12%).
      </p>
      {error ? (
        <p className="text-sm text-rose-700">{error.message}</p>
      ) : (properties ?? []).length === 0 ? (
        <p className="text-sm text-slate-600">No properties are linked to this owner yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(properties ?? []).map((p) => {
            const ma = Array.isArray(p.management_agreements)
              ? p.management_agreements[0]
              : p.management_agreements;
            const fees = feeByProperty.get(p.id) ?? [];
            const minFee = fees.length ? Math.min(...fees) : Number(ma?.fee_percent);
            const maxFee = fees.length ? Math.max(...fees) : Number(ma?.fee_percent);
            const feeLabel =
              minFee === maxFee
                ? formatFeePercent(minFee)
                : `${formatFeePercent(minFee)}–${formatFeePercent(maxFee)}`;
            return (
              <Link
                key={p.id}
                href={`/owner/properties/${p.id}`}
                className="block rounded-lg transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Card title={p.name}>
                  <p className="text-sm text-slate-600">
                    {p.address_line1}, {p.city}, {p.state}
                  </p>
                  <p className="mt-2 text-sm">
                    Management fee {feeLabel} of collected rent (tenant credit-based)
                    · spend approval threshold {formatMoney(ma?.approval_threshold)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge status="active" />
                    <span className="text-sm text-[#c4784a]">View details →</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
