import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { firstRelation } from "@/lib/work-order-routing";
import { ownerDisplayPhone, ownerPreferredContact } from "@/lib/owner-contact";

export default async function AdminPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole(["admin"]);
  const { data: property } = await supabase
    .from("properties")
    .select(
      "id, name, address_line1, city, state, postal_code, property_type, square_feet, status, owner_id, owners(id, contact_name, company_name, email, phone), management_agreements(approval_threshold, fee_percent, status)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  const owner = firstRelation(property.owners);
  const agreement = firstRelation(property.management_agreements);
  const phone = owner
    ? ownerDisplayPhone(owner.id ?? property.owner_id, owner.phone)
    : "—";
  const preferred = owner
    ? ownerPreferredContact(owner.id ?? property.owner_id)
    : "Email";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/owners" className="text-sm text-[#c4784a]">
          ← Property Owners
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          {property.name}
        </h1>
        <p className="mt-1 text-slate-600">
          {property.address_line1}, {property.city}, {property.state}{" "}
          {property.postal_code}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Property">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Type</dt>
              <dd className="capitalize text-[#0c1f2e]">{property.property_type}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Square feet</dt>
              <dd className="text-[#0c1f2e]">
                {property.square_feet?.toLocaleString() ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <Badge status={property.status} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Management fee</dt>
              <dd className="text-[#0c1f2e]">{agreement?.fee_percent ?? "—"}%</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Owner approval threshold</dt>
              <dd className="text-[#0c1f2e]">
                {formatMoney(agreement?.approval_threshold ?? 2500)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Property owner">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Owner</dt>
              <dd className="text-right text-[#0c1f2e]">
                {owner?.contact_name ?? "—"}
                {owner?.company_name ? (
                  <span className="block text-xs text-slate-500">
                    {owner.company_name}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-[#0c1f2e]">{phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-[#0c1f2e]">{owner?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Preferred contact</dt>
              <dd className="text-[#0c1f2e]">{preferred}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Contact this owner for major repairs, emergencies, lease issues, or
            capital work above the approval threshold.
          </p>
        </Card>
      </div>
    </div>
  );
}
