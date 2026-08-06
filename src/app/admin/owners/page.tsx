import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ownerDisplayPhone, ownerPreferredContact } from "@/lib/owner-contact";

export default async function AdminPropertyOwnersPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: owners } = await supabase
    .from("owners")
    .select("id, contact_name, company_name, email, phone, properties(id)")
    .order("contact_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          Property Owners
        </h1>
        <p className="mt-1 text-slate-600">
          Contact owners quickly when major repairs, emergencies, lease issues, or
          capital work need authorization.
        </p>
      </div>

      <Card title="Property Owners">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Property owner</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Preferred contact</th>
                <th className="py-2 pr-3">Properties</th>
                <th className="py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {(owners ?? []).map((owner) => {
                const propertyCount = Array.isArray(owner.properties)
                  ? owner.properties.length
                  : 0;
                const phone = ownerDisplayPhone(owner.id, owner.phone);
                const preferred = ownerPreferredContact(owner.id);

                return (
                  <tr key={owner.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 text-[#0c1f2e]">
                      <div className="font-medium">
                        {owner.contact_name ?? "—"}
                      </div>
                      {owner.company_name ? (
                        <div className="text-xs text-slate-500">
                          {owner.company_name}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-[#0c1f2e]">
                      <span className="inline-flex items-center gap-1.5">
                        <svg
                          viewBox="0 0 20 20"
                          className="h-3.5 w-3.5 fill-current text-slate-400"
                          aria-hidden="true"
                        >
                          <path d="M3.5 3.5h3l1 3-1.7 1.7a12 12 0 0 0 5 5L12.5 11.5l3 1v3a1 1 0 0 1-1 1A13.5 13.5 0 0 1 2.5 4.5a1 1 0 0 1 1-1Z" />
                        </svg>
                        {phone}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-[#0c1f2e]">
                      <span className="inline-flex items-center gap-1.5">
                        <svg
                          viewBox="0 0 20 20"
                          className="h-3.5 w-3.5 fill-current text-slate-400"
                          aria-hidden="true"
                        >
                          <path d="M3 4.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm0 1.3 7 4.4 7-4.4V5.5L10 9.7 3 5.8v0Z" />
                        </svg>
                        {owner.email ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {preferred}
                      </span>
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-[#0c1f2e]">
                      {propertyCount}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/owners/${owner.id}`}
                        className="inline-flex rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                      >
                        View properties
                      </Link>
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
