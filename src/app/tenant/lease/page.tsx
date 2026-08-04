import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function TenantLeasePage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const tenantId =
    tenant?.id ??
    (await supabase.from("tenants").select("id").limit(1).single()).data?.id;

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "*, properties(name), security_deposits(amount, status, notes), lease_amendments(amendment_type, description, effective_date)"
    )
    .eq("tenant_id", tenantId!);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">My lease</h1>
      {(leases ?? []).map((l) => {
        const prop = Array.isArray(l.properties) ? l.properties[0] : l.properties;
        const deps = (l.security_deposits as { amount: number; status: string; notes: string | null }[]) ?? [];
        const amends = (l.lease_amendments as { amendment_type: string; description: string; effective_date: string }[]) ?? [];
        return (
          <Card key={l.id} title={`${l.lease_number} · ${prop?.name ?? ""}`} action={<Badge status={l.status} />}>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Type: {l.lease_type.replaceAll("_", " ")}</p>
              <p>
                Term: {l.start_date} → {l.end_date}
              </p>
              <p>Base rent: {formatMoney(l.base_rent_monthly)}</p>
              <p>CAM: {formatMoney(l.cam_monthly)}</p>
              <p>Grace days: {l.grace_days}</p>
              <p>Late fee: {l.late_fee_percent}% of rent after grace</p>
            </div>
            {deps.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
                <p className="font-medium">Security deposits (liability / escrow)</p>
                <ul className="mt-1 space-y-1">
                  {deps.map((d, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {formatMoney(d.amount)} {d.notes ? `· ${d.notes}` : ""}
                      </span>
                      <Badge status={d.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {amends.length > 0 ? (
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {amends.map((a, i) => (
                  <li key={i}>
                    {a.effective_date} · {a.amendment_type}: {a.description}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
