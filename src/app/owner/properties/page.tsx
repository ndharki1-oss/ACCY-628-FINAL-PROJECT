import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function OwnerPropertiesPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const ownerId =
    owner?.id ??
    (await supabase.from("owners").select("id").limit(1).single()).data?.id;

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, name, address_line1, city, state, management_agreements(fee_percent, approval_threshold)"
    )
    .eq("owner_id", ownerId!);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Your properties
      </h1>
      <div className="grid gap-4 md:grid-cols-2">
        {(properties ?? []).map((p) => {
          const ma = Array.isArray(p.management_agreements)
            ? p.management_agreements[0]
            : p.management_agreements;
          return (
            <Card key={p.id} title={p.name}>
              <p className="text-sm text-slate-600">
                {p.address_line1}, {p.city}, {p.state}
              </p>
              <p className="mt-2 text-sm">
                Management fee {ma?.fee_percent}% of collected rent · spend
                approval threshold {formatMoney(ma?.approval_threshold)}
              </p>
              <div className="mt-3">
                <Badge status="active" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
