import { requireRole } from "@/lib/auth";
import { getLinkedVendorId } from "@/lib/portal";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { vendorCompleteWorkOrder } from "@/app/actions/business";
import { employeeCanWorkStatus } from "@/lib/work-order-routing";

export default async function EmployeeWorkOrdersPage() {
  const { supabase, user } = await requireRole(["vendor"]);
  const { vendorId, vendor, error: vendorError } = await getLinkedVendorId(
    supabase,
    user
  );

  const { data: wos } = vendorId
    ? await supabase
        .from("work_orders")
        .select("*, properties(name, address_line1, city)")
        .eq("vendor_id", vendorId)
        .order("scheduled_date", { ascending: false })
    : { data: [] };

  const active = (wos ?? []).filter((w) => employeeCanWorkStatus(w.status));
  const completed = (wos ?? [])
    .filter((w) => w.status === "approved" && w.completed_at)
    .slice(0, 12);

  const payerNote =
    vendor?.worker_type === "contractor"
      ? "Contractor jobs: owner pays after approval."
      : "In-house jobs: Harborline pays.";

  return (
    <div className="space-y-6">
      <PageHeading
        title="Assignments"
        vital={payerNote}
        info="Work orders assigned to you under Harborline routing rules."
      />
      {vendorError ? (
        <p className="text-sm text-rose-700">
          This login is not linked to an employee work record.
        </p>
      ) : null}

      <Card title={`Open assignments (${active.length})`}>
        {active.length === 0 ? (
          <p className="text-sm text-slate-600">
            No open assignments linked to this account.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.map((w) => {
              const prop = Array.isArray(w.properties)
                ? w.properties[0]
                : w.properties;
              return (
                <li key={w.id} className="space-y-3 py-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {w.wo_number}: {w.title}
                      </p>
                      <p className="text-slate-600">
                        {prop?.name} · {prop?.address_line1}, {prop?.city} ·{" "}
                        {w.wo_type} · scheduled {w.scheduled_date ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Estimate {formatMoney(w.estimated_cost)}
                        {w.requires_owner_approval
                          ? " · Payer: property owner"
                          : " · Payer: Harborline (in-house)"}
                      </p>
                    </div>
                    <Badge status={w.status} />
                  </div>
                  <p className="text-sm text-slate-700">{w.description}</p>
                  <form
                    action={vendorCompleteWorkOrder}
                    className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <input type="hidden" name="id" value={w.id} />
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="Work performed / exceptions"
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                      required
                    />
                    <label className="block">
                      Actual cost (USD)
                      <input
                        name="actual_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Number(w.estimated_cost) || 0}
                        className="mt-1 w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded bg-[#0c1f2e] px-4 py-2 text-white"
                    >
                      Mark complete
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title={`Recently completed (${completed.length})`}>
        {completed.length === 0 ? (
          <p className="text-sm text-slate-600">No completed jobs on this login yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {completed.map((w) => {
              const prop = Array.isArray(w.properties)
                ? w.properties[0]
                : w.properties;
              return (
                <li
                  key={w.id}
                  className="flex flex-wrap items-start justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {w.wo_number}: {w.title}
                    </p>
                    <p className="text-slate-600">
                      {prop?.name} · actual {formatMoney(w.actual_cost)}
                      {w.completed_at
                        ? ` · ${String(w.completed_at).slice(0, 10)}`
                        : ""}
                    </p>
                  </div>
                  <Badge status={w.status} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
