import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function OwnerStatementsPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const ownerId =
    owner?.id ??
    (await supabase.from("owners").select("id").limit(1).single()).data?.id;

  const { data: statements } = await supabase
    .from("owner_statements")
    .select(
      "*, properties(name), owner_statement_lines(line_type, description, amount)"
    )
    .eq("owner_id", ownerId!)
    .order("period_end", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Owner statements & remittances
      </h1>
      <p className="text-slate-600">
        Collections − owner expenses − management fee (% of collected) = remittance
        due to you.
      </p>
      {(statements ?? []).map((s) => {
        const prop = Array.isArray(s.properties) ? s.properties[0] : s.properties;
        const lines = (s.owner_statement_lines as { line_type: string; description: string; amount: number }[]) ?? [];
        return (
          <Card
            key={s.id}
            title={`${s.statement_number} · ${prop?.name ?? ""}`}
            action={<Badge status={s.status} />}
          >
            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Collections</p>
                <p>{formatMoney(s.total_collections)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Expenses</p>
                <p>{formatMoney(s.total_expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mgmt fee</p>
                <p>{formatMoney(s.management_fee)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Remittance</p>
                <p className="font-medium">{formatMoney(s.remittance_due)}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
              {lines.map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    [{l.line_type}] {l.description}
                  </span>
                  <span>{formatMoney(l.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
