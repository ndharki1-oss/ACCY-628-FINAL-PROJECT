import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import {
  ownerApproveCost,
  ownerApproveWorkOrder,
} from "@/app/actions/business";

export default async function OwnerApprovalsPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const ownerId =
    owner?.id ??
    (await supabase.from("owners").select("id").limit(1).single()).data?.id;

  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", ownerId!);
  const propIds = (properties ?? []).map((p) => p.id);

  const [{ data: wos }, { data: costs }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, wo_number, title, vendor_notes, actual_cost, status, properties(name)")
      .in("property_id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("status", "pending_owner_approval"),
    supabase
      .from("cost_entries")
      .select("id, description, amount, category, incurred_date")
      .eq("owner_id", ownerId!)
      .eq("owner_approved", false),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Approvals
      </h1>
      <p className="text-slate-600">
        Control: work is not complete for billing/owner books until you approve.
        Costs over the agreement threshold cannot hit your statement unapproved.
      </p>

      <Card title="Work order completions">
        {(wos ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">No vendor completions waiting.</p>
        ) : (
          <ul className="space-y-4">
            {(wos ?? []).map((w) => {
              const prop = Array.isArray(w.properties) ? w.properties[0] : w.properties;
              return (
                <li key={w.id} className="rounded border border-slate-200 p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {w.wo_number}: {w.title}
                      </p>
                      <p className="text-slate-600">
                        {prop?.name} · claimed cost {formatMoney(w.actual_cost)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Vendor notes: {w.vendor_notes || "—"}
                      </p>
                    </div>
                    <Badge status={w.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={ownerApproveWorkOrder}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button
                        type="submit"
                        className="rounded bg-emerald-700 px-3 py-1.5 text-white"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={ownerApproveWorkOrder} className="flex gap-2">
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input
                        name="reason"
                        placeholder="Rejection reason"
                        className="rounded border px-2 py-1"
                        required
                      />
                      <button
                        type="submit"
                        className="rounded bg-rose-700 px-3 py-1.5 text-white"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Unapproved costs">
        <ul className="space-y-3">
          {(costs ?? []).map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{c.description}</p>
                <p className="text-xs text-slate-500">
                  {c.category} · {c.incurred_date}
                  {Number(c.amount) > 2500
                    ? " · exceeds $2,500 threshold"
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span>{formatMoney(c.amount)}</span>
                <form action={ownerApproveCost}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50"
                  >
                    Approve
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
