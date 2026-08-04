import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function OwnerNoiPage() {
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
    .select("id, name")
    .eq("owner_id", ownerId!);
  const propIds = (properties ?? []).map((p) => p.id);

  const [{ data: invoices }, { data: costs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("property_id, total, status, party_type")
      .in("property_id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("cost_entries").select("property_id, amount").eq("owner_id", ownerId!),
  ]);

  const rows = (properties ?? []).map((p) => {
    const rev = (invoices ?? [])
      .filter(
        (i) =>
          i.property_id === p.id &&
          i.party_type === "tenant" &&
          i.status !== "void"
      )
      .reduce((s, i) => s + Number(i.total), 0);
    const exp = (costs ?? [])
      .filter((c) => c.property_id === p.id)
      .reduce((s, c) => s + Number(c.amount), 0);
    return { ...p, rev, exp, noi: rev - exp };
  });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Property NOI
      </h1>
      <p className="text-slate-600">
        NOI ≈ tenant charges − property operating costs (owner economics). Harborline
        fee is separate and settled on remittance.
      </p>
      <Card title="By property">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Property</th>
              <th className="py-2">Charges</th>
              <th className="py-2">OpEx</th>
              <th className="py-2">NOI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2">{r.name}</td>
                <td className="py-2">{formatMoney(r.rev)}</td>
                <td className="py-2">{formatMoney(r.exp)}</td>
                <td className={`py-2 font-medium ${r.noi < 0 ? "text-rose-700" : ""}`}>
                  {formatMoney(r.noi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
