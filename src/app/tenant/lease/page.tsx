import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

type LeaseRow = {
  id: string;
  lease_number: string;
  lease_type: string;
  status: string;
  start_date: string;
  end_date: string;
  base_rent_monthly: number;
  cam_monthly: number;
  grace_days: number;
  late_fee_percent: number;
  properties: { name: string } | { name: string }[] | null;
  security_deposits: { amount: number; status: string; notes: string | null }[] | null;
  lease_amendments:
    | { amendment_type: string; description: string; effective_date: string }[]
    | null;
};

function isCurrentLease(status: string) {
  return status === "active" || status === "renewal_pending";
}

function LeaseCard({ lease }: { lease: LeaseRow }) {
  const prop = Array.isArray(lease.properties)
    ? lease.properties[0]
    : lease.properties;
  const deps = lease.security_deposits ?? [];
  const amends = lease.lease_amendments ?? [];

  return (
    <Card
      title={`${lease.lease_number} · ${prop?.name ?? ""}`}
      action={<Badge status={lease.status} />}
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>Type: {lease.lease_type.replaceAll("_", " ")}</p>
        <p>
          Term: {lease.start_date} → {lease.end_date}
        </p>
        <p>Base rent: {formatMoney(lease.base_rent_monthly)}</p>
        <p>CAM: {formatMoney(lease.cam_monthly)}</p>
        <p>Grace days: {lease.grace_days}</p>
        <p>Late fee: {lease.late_fee_percent}% of rent after grace</p>
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
}

function LeaseSection({
  title,
  leases,
  emptyMessage,
}: {
  title: string;
  leases: LeaseRow[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-slate-800">
        {title}
      </h2>
      {leases.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyMessage}</p>
      ) : (
        leases.map((lease) => <LeaseCard key={lease.id} lease={lease} />)
      )}
    </section>
  );
}

export default async function TenantLeasePage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId, error: tenantError } = await getLinkedTenantId(supabase, user);

  if (!tenantId) {
    return (
      <div className="space-y-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">My leases</h1>
        <p className="text-sm text-rose-700">
          {tenantError ?? "This login is not linked to a tenant record."}
        </p>
      </div>
    );
  }

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "*, properties(name), security_deposits(amount, status, notes), lease_amendments(amendment_type, description, effective_date)"
    )
    .eq("tenant_id", tenantId)
    .order("start_date", { ascending: false });

  const allLeases = (leases ?? []) as LeaseRow[];
  const current = allLeases.filter((l) => isCurrentLease(l.status));
  const previous = allLeases.filter((l) => !isCurrentLease(l.status));

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">My leases</h1>
      <LeaseSection
        title="Current leases"
        leases={current}
        emptyMessage="No current leases on file."
      />
      <LeaseSection
        title="Previous leases"
        leases={previous}
        emptyMessage="No previous leases on file."
      />
    </div>
  );
}
