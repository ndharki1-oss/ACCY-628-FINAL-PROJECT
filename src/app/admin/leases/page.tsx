import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { feePercentFromCredit, formatFeePercent, formatMoney } from "@/lib/utils";

export default async function AdminLeasesPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, tenants(company_name, credit_rating), properties(name), lease_amendments(id, amendment_type, description, effective_date, owner_acknowledged)"
    )
    .order("lease_number");

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Leases</h1>
      <p className="text-slate-600">
        Management fee is a credit-based % of collected rent (4–12%). Lease
        structure (NNN / CAM / etc.) still drives tenant billing only.
      </p>
      <Card title="Lease register & amendments">
        <div className="space-y-4">
          {(leases ?? []).map((l) => {
            const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
            const prop = Array.isArray(l.properties) ? l.properties[0] : l.properties;
            const credit = tenant?.credit_rating as string | undefined;
            const feePct = feePercentFromCredit(credit);
            const amends =
              (l.lease_amendments as {
                id: string;
                amendment_type: string;
                description: string;
                effective_date: string;
                owner_acknowledged: boolean;
              }[]) ?? [];
            return (
              <div key={l.id} className="rounded border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {l.lease_number} · {tenant?.company_name}
                    </p>
                    <p className="text-sm font-medium text-[#0c1f2e]">
                      Management fee: {formatFeePercent(feePct)} of collected
                      rent · Tenant credit: {credit ?? "—"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {prop?.name} · Lease structure:{" "}
                      {l.lease_type.replaceAll("_", " ")} · rent{" "}
                      {formatMoney(l.base_rent_monthly)} + CAM{" "}
                      {formatMoney(l.cam_monthly)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {l.start_date} → {l.end_date}
                    </p>
                  </div>
                  <Badge status={l.status} />
                </div>
                {amends.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    {amends.map((a) => (
                      <li key={a.id}>
                        <span className="font-medium capitalize">
                          {a.amendment_type}
                        </span>{" "}
                        ({a.effective_date}): {a.description}
                        {a.owner_acknowledged
                          ? " · owner ack"
                          : " · pending owner ack"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
