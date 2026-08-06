import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Card } from "@/components/ui";
import { PropertyLink } from "@/components/property-link";
import { formatMoney } from "@/lib/utils";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function OwnerNoiPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  const { data: properties, error: propertyError } = ownerId
    ? await supabase.from("properties").select("id, name").eq("owner_id", ownerId)
    : { data: [], error: ownerError ? { message: ownerError } : null };
  const propIds = (properties ?? []).map((p) => p.id);

  const [{ data: invoices }, { data: costs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("property_id, total, status, party_type")
      .in("property_id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"]),
    ownerId
      ? supabase.from("cost_entries").select("property_id, amount").eq("owner_id", ownerId)
      : Promise.resolve({ data: [] }),
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
        fee is separate and settled on remittance. Figures are {ALL_PERIODS_HINT} — not
        a single month.
      </p>
      {propertyError ? (
        <p className="text-sm text-rose-700">{propertyError.message}</p>
      ) : null}
      <Card title={`By property · ${ALL_PERIODS_HINT}`}>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No property NOI to display yet.</p>
        ) : (
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
                  <td className="py-2">
                    <PropertyLink id={r.id}>{r.name}</PropertyLink>
                  </td>
                  <td className="py-2">{formatMoney(r.rev)}</td>
                  <td className="py-2">{formatMoney(r.exp)}</td>
                  <td className={`py-2 font-medium ${r.noi < 0 ? "text-rose-700" : ""}`}>
                    {formatMoney(r.noi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
