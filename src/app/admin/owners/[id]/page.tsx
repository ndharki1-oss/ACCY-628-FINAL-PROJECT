import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { ownerDisplayPhone } from "@/lib/owner-contact";

export default async function AdminOwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole(["admin"]);

  const [{ data: owner }, { data: properties }] = await Promise.all([
    supabase
      .from("owners")
      .select("id, contact_name, company_name, email, phone")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("properties")
      .select(
        "id, name, address_line1, city, state, postal_code, property_type, status"
      )
      .eq("owner_id", id)
      .order("name"),
  ]);

  if (!owner) notFound();

  const phone = ownerDisplayPhone(owner.id, owner.phone);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/owners"
          className="text-sm text-slate-600 hover:text-[#0c1f2e] hover:underline"
        >
          ← Property Owners
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          {owner.contact_name ?? "Property owner"}
        </h1>
        {owner.company_name ? (
          <p className="mt-1 text-slate-600">{owner.company_name}</p>
        ) : null}
      </div>

      <Card title="Contact">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-baseline gap-2 text-sm">
            <dt className="shrink-0 text-slate-500">Phone</dt>
            <dd className="text-[#0c1f2e]">{phone}</dd>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <dt className="shrink-0 text-slate-500">Email</dt>
            <dd className="break-all text-[#0c1f2e]">{owner.email ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Properties">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Property</th>
                <th className="py-2 pr-3">Address</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {(properties ?? []).map((property) => (
                <tr key={property.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-medium text-[#0c1f2e]">
                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="hover:underline"
                    >
                      {property.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-[#0c1f2e]">
                    {property.address_line1}, {property.city}, {property.state}{" "}
                    {property.postal_code}
                  </td>
                  <td className="py-3 pr-3 capitalize text-[#0c1f2e]">
                    {property.property_type}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge status={property.status} />
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="inline-flex rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                    >
                      View property
                    </Link>
                  </td>
                </tr>
              ))}
              {(properties ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No properties are linked to this owner.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
