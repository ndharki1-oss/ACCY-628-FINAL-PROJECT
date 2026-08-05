import { requireRole } from "@/lib/auth";
import { getLinkedVendorId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { vendorCompleteWorkOrder } from "@/app/actions/business";

export default async function EmployeeWorkOrdersPage() {
  const { supabase, user } = await requireRole(["vendor"]);
  const { vendorId, error: vendorError } = await getLinkedVendorId(supabase, user);

  const { data: wos } = vendorId
    ? await supabase
        .from("work_orders")
        .select("*, properties(name, address_line1, city)")
        .eq("vendor_id", vendorId)
        .order("scheduled_date", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Assignments
      </h1>
      <p className="text-slate-600">
        Mark complete and enter costs. Owner approval is required before work is
        considered accepted.
      </p>
      {vendorError ? (
        <p className="text-sm text-rose-700">
          This login is not linked to an employee work record.
        </p>
      ) : null}
      {(wos ?? []).length === 0 ? (
        <p className="text-sm text-slate-600">No assignments linked to this account yet.</p>
      ) : null}
      {(wos ?? []).map((w) => {
        const prop = Array.isArray(w.properties) ? w.properties[0] : w.properties;
        const canComplete = ["assigned", "in_progress", "open", "rejected"].includes(
          w.status
        );
        return (
          <Card
            key={w.id}
            title={`${w.wo_number}: ${w.title}`}
            action={<Badge status={w.status} />}
          >
            <p className="text-sm text-slate-600">
              {prop?.name} · {prop?.address_line1}, {prop?.city} · {w.wo_type} ·
              scheduled {w.scheduled_date}
            </p>
            <p className="mt-1 text-sm">{w.description}</p>
            <p className="mt-1 text-xs text-slate-500">
              Estimate {formatMoney(w.estimated_cost)}
              {w.actual_cost
                ? ` · actual ${formatMoney(w.actual_cost)}`
                : ""}
            </p>
            {canComplete ? (
              <form action={vendorCompleteWorkOrder} className="mt-4 space-y-2 text-sm">
                <input type="hidden" name="id" value={w.id} />
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Work performed / exceptions"
                  className="w-full rounded border border-slate-300 px-3 py-2"
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
                    className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded bg-[#0c1f2e] px-4 py-2 text-white"
                >
                  Submit completion for owner approval
                </button>
              </form>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
