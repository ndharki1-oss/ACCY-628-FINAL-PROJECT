import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

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
            const ma = Array.isArray(p.management_agreements)
              ? p.management_agreements[0]
              : p.management_agreements;
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
                    Management fee {ma?.fee_percent}% of collected rent · spend
                    approval threshold {formatMoney(ma?.approval_threshold)}
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
