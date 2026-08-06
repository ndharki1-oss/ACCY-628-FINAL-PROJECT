import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { LeaseDocumentButton } from "./lease-document-button";

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
  security_deposits:
    | {
        id: string;
        amount: number;
        status: string;
        notes: string | null;
        security_deposit_events:
          | {
              id: string;
              event_type: string;
              amount: number;
              description: string | null;
              occurred_on: string;
            }[]
          | null;
      }[]
    | null;
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
        <p>Late fee: 5% of rent after 7 days</p>
      </div>
      {deps.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
          <p className="font-medium">Security deposits (liability / escrow)</p>
          <ul className="mt-2 space-y-3">
            {deps.map((d) => {
              const events = [...(d.security_deposit_events ?? [])].sort((a, b) =>
                String(b.occurred_on).localeCompare(String(a.occurred_on))
              );
              return (
                <li key={d.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex justify-between gap-3">
                    <span>
                      {formatMoney(d.amount)}
                      {d.notes ? ` · ${d.notes}` : ""}
                    </span>
                    <Badge status={d.status} />
                  </div>
                  {events.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {events.map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <span className="capitalize">
                            {e.event_type}
                            {e.description ? ` · ${e.description}` : ""}
                            <span className="text-slate-400"> · {e.occurred_on}</span>
                          </span>
                          <span className="tabular-nums">{formatMoney(e.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
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
      <div className="mt-4 border-t border-slate-100 pt-3">
        <LeaseDocumentButton
          leaseId={lease.id}
          leaseNumber={lease.lease_number}
        />
      </div>
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
      "*, properties(name), security_deposits(id, amount, status, notes, security_deposit_events(id, event_type, amount, description, occurred_on)), lease_amendments(amendment_type, description, effective_date)"
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
