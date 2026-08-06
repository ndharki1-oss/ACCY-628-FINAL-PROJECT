import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { adminDisposeSecurityDeposit } from "@/app/actions/business";
import { firstRelation } from "@/lib/work-order-routing";

export default async function AdminDepositsPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data: deposits } = await supabase
    .from("security_deposits")
    .select(
      "id, amount, status, notes, received_date, property_id, lease_id, properties(name), tenants(company_name), leases(lease_number), security_deposit_events(id, event_type, amount, description, occurred_on, created_at)"
    )
    .order("received_date", { ascending: false });

  const rows = (deposits ?? []).map((d) => {
    const property = firstRelation(d.properties);
    const tenant = firstRelation(d.tenants);
    const lease = firstRelation(d.leases);
    const events = [...(d.security_deposit_events ?? [])].sort((a, b) =>
      String(b.occurred_on).localeCompare(String(a.occurred_on))
    );
    const applied = events
      .filter((e) => e.event_type === "applied")
      .reduce((s, e) => s + Number(e.amount), 0);
    const refunded = events
      .filter((e) => e.event_type === "refunded")
      .reduce((s, e) => s + Number(e.amount), 0);
    return {
      ...d,
      propertyName: property?.name ?? "Property",
      tenantName: tenant?.company_name ?? "Tenant",
      leaseNumber: lease?.lease_number ?? "—",
      events,
      applied,
      refunded,
    };
  });

  const held = rows.filter((r) => r.status === "held");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Security Deposits"
        vital="Use disposition on a held deposit to demo applied damages + refund (writes ledger events; does not delete seed)."
        info="Escrow ledger for tenant deposits."
      />

      <Card title={`Held deposits (${held.length})`}>
        {held.length === 0 ? (
          <p className="text-sm text-slate-600">No held deposits right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {held.map((d) => (
              <li key={d.id} className="space-y-3 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#0c1f2e]">
                      {d.tenantName} · {d.propertyName}
                    </p>
                    <p className="text-slate-600">
                      Lease {d.leaseNumber} · received {d.received_date ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {formatMoney(d.amount)}
                    </span>
                    <Badge status={d.status} />
                  </div>
                </div>
                <form
                  action={adminDisposeSecurityDeposit}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                >
                  <input type="hidden" name="deposit_id" value={d.id} />
                  <label className="text-xs text-slate-600">
                    Apply to damages (USD)
                    <input
                      name="applied_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={Number(d.amount)}
                      defaultValue={Math.min(750, Number(d.amount))}
                      required
                      className="mt-1 block w-36 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Notes
                    <input
                      name="notes"
                      defaultValue="Move-out: carpet / wall repair"
                      className="mt-1 block w-56 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded bg-[#0c1f2e] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Record disposition
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Deposit ledger">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No deposits on file.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((d) => (
              <li key={d.id} className="space-y-2 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {d.tenantName} · {d.propertyName} · {d.leaseNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      Face amount {formatMoney(d.amount)}
                      {d.applied > 0 ? ` · applied ${formatMoney(d.applied)}` : ""}
                      {d.refunded > 0
                        ? ` · refunded ${formatMoney(d.refunded)}`
                        : ""}
                    </p>
                  </div>
                  <Badge status={d.status} />
                </div>
                {d.events.length === 0 ? (
                  <p className="text-xs text-slate-500">No ledger events yet.</p>
                ) : (
                  <ul className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
                    {d.events.map((e) => (
                      <li key={e.id} className="flex justify-between gap-3">
                        <span>
                          <span className="font-medium capitalize text-slate-700">
                            {e.event_type}
                          </span>
                          {e.description ? ` · ${e.description}` : ""}
                          <span className="text-slate-400">
                            {" "}
                            · {e.occurred_on}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-[#0c1f2e]">
                          {formatMoney(e.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
