import { requireRole } from "@/lib/auth";
import { Badge, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export default async function OwnerDashboard() {
  const { supabase, user } = await requireRole(["owner"]);
  const { data: owner } = await supabase
    .from("owners")
    .select("id, company_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Admin preview: first owner
  const ownerId =
    owner?.id ??
    (
      await supabase.from("owners").select("id, company_name").limit(1).single()
    ).data?.id;

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("owner_id", ownerId!);

  const propIds = (properties ?? []).map((p) => p.id);

  const [{ data: pendingWo }, { data: pendingCosts }, { data: statements }, { data: costs }, { data: invoices }] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("id, wo_number, title, actual_cost, status")
        .in("property_id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("status", "pending_owner_approval"),
      supabase
        .from("cost_entries")
        .select("id, description, amount")
        .eq("owner_id", ownerId!)
        .eq("owner_approved", false)
        .gt("amount", 2500),
      supabase
        .from("owner_statements")
        .select("id, statement_number, remittance_due, status, period_end, properties(name)")
        .eq("owner_id", ownerId!)
        .order("period_end", { ascending: false })
        .limit(5),
      supabase.from("cost_entries").select("amount, property_id").eq("owner_id", ownerId!),
      supabase
        .from("invoices")
        .select("total, property_id, status, party_type")
        .in("property_id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("party_type", "tenant"),
    ]);

  const revenue = (invoices ?? [])
    .filter((i) => i.status !== "void")
    .reduce((s, i) => s + Number(i.total), 0);
  const expense = (costs ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const remittance = (statements ?? []).reduce(
    (s, st) => s + Number(st.remittance_due),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Owner portal
        </h1>
        <p className="text-slate-600">
          Approve work, track NOI, and review remittances for your properties.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Portfolio NOI signal" value={formatMoney(revenue - expense)} />
        <Stat label="Remittance (statements)" value={formatMoney(remittance)} />
        <Stat
          label="Approvals waiting"
          value={String((pendingWo ?? []).length + (pendingCosts ?? []).length)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Open approvals"
          action={
            <Link href="/owner/approvals" className="text-sm text-[#c4784a]">
              Review →
            </Link>
          }
        >
          {(pendingWo ?? []).length === 0 && (pendingCosts ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">Nothing pending.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(pendingWo ?? []).map((w) => (
                <li key={w.id} className="flex justify-between">
                  <span>
                    {w.wo_number}: {w.title}
                  </span>
                  <Badge status={w.status} />
                </li>
              ))}
              {(pendingCosts ?? []).map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.description}</span>
                  <span>{formatMoney(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent statements">
          <ul className="space-y-2 text-sm">
            {(statements ?? []).map((s) => {
              const prop = Array.isArray(s.properties) ? s.properties[0] : s.properties;
              return (
                <li key={s.id} className="flex justify-between border-b border-slate-50 py-2">
                  <span>
                    {s.statement_number} · {prop?.name}
                  </span>
                  <span>{formatMoney(s.remittance_due)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
