"use client";

import { useMemo } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { Badge } from "@/components/ui";
import { adminDisposeSecurityDeposit } from "@/app/actions/business";
import { formatMoney } from "@/lib/utils";

export type AdminDepositRow = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  received_date: string | null;
  propertyName: string;
  tenantName: string;
  leaseNumber: string;
  applied: number;
  refunded: number;
  events: {
    id: string;
    event_type: string;
    amount: number;
    description: string | null;
    occurred_on: string;
  }[];
};

function sortByPropertyThenTenant(a: AdminDepositRow, b: AdminDepositRow) {
  const prop = a.propertyName.localeCompare(b.propertyName);
  if (prop !== 0) return prop;
  return a.tenantName.localeCompare(b.tenantName);
}

export function AdminDepositsWorkspace({ rows }: { rows: AdminDepositRow[] }) {
  const held = useMemo(
    () => rows.filter((r) => r.status === "held").sort(sortByPropertyThenTenant),
    [rows]
  );
  const ledger = useMemo(
    () => [...rows].sort(sortByPropertyThenTenant),
    [rows]
  );

  const heldByProperty = useMemo(() => groupByProperty(held), [held]);
  const ledgerByProperty = useMemo(() => groupByProperty(ledger), [ledger]);

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title={`Held deposits (${held.length})`}
        defaultOpen
      >
        {held.length === 0 ? (
          <p className="text-sm text-slate-600">No held deposits right now.</p>
        ) : (
          <div className="space-y-5">
            {heldByProperty.map(([propertyName, deposits]) => (
              <section key={propertyName}>
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
                  {propertyName}
                </h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {deposits.map((d) => (
                    <li key={d.id} className="space-y-3 px-3 py-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#0c1f2e]">
                            {d.tenantName}
                          </p>
                          <p className="text-slate-600">
                            Lease {d.leaseNumber} · received{" "}
                            {d.received_date ?? "—"}
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
              </section>
            ))}
          </div>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Deposit ledger" defaultOpen={false}>
        {ledger.length === 0 ? (
          <p className="text-sm text-slate-600">No deposits on file.</p>
        ) : (
          <div className="space-y-5">
            {ledgerByProperty.map(([propertyName, deposits]) => (
              <section key={propertyName}>
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-base text-[#0c1f2e]">
                  {propertyName}
                </h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {deposits.map((d) => (
                    <li key={d.id} className="space-y-2 px-3 py-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {d.tenantName} · {d.leaseNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            Face amount {formatMoney(d.amount)}
                            {d.applied > 0
                              ? ` · applied ${formatMoney(d.applied)}`
                              : ""}
                            {d.refunded > 0
                              ? ` · refunded ${formatMoney(d.refunded)}`
                              : ""}
                          </p>
                        </div>
                        <Badge status={d.status} />
                      </div>
                      {d.events.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No ledger events yet.
                        </p>
                      ) : (
                        <ul className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
                          {d.events.map((e) => (
                            <li
                              key={e.id}
                              className="flex justify-between gap-3"
                            >
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
              </section>
            ))}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}

function groupByProperty(rows: AdminDepositRow[]) {
  const map = new Map<string, AdminDepositRow[]>();
  for (const row of rows) {
    const list = map.get(row.propertyName) ?? [];
    list.push(row);
    map.set(row.propertyName, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
