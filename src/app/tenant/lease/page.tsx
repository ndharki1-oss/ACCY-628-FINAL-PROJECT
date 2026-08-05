import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function TenantLeasePage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId, error: tenantError } = await getLinkedTenantId(supabase, user);

  const { data: leases, error } = tenantId
    ? await supabase
        .from("leases")
        .select(
          "*, properties(name), security_deposits(amount, status, notes), lease_amendments(amendment_type, description, effective_date)"
        )
        .eq("tenant_id", tenantId)
    : { data: [], error: tenantError ? { message: tenantError } : null };

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">My lease</h1>
      {error ? <p className="text-sm text-rose-700">{error.message}</p> : null}
      {(leases ?? []).length === 0 && !error ? (
        <p className="text-sm text-slate-600">No leases are linked to this tenant yet.</p>
      ) : null}
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
