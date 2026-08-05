import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { Badge, Card } from "@/components/ui";
import { PropertyLink } from "@/components/property-link";
import { formatMoney } from "@/lib/utils";
import {
  ownerApproveCost,
  ownerApproveWorkOrder,
} from "@/app/actions/business";

export default async function OwnerApprovalsPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  const { data: properties } = ownerId
    ? await supabase.from("properties").select("id").eq("owner_id", ownerId)
    : { data: [] };
  const propIds = (properties ?? []).map((p) => p.id);

  const [{ data: wos }, { data: costs }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, property_id, wo_number, title, vendor_notes, actual_cost, status, properties(name)"
      )
      .in("property_id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("status", "pending_owner_approval"),
    ownerId
      ? supabase
          .from("cost_entries")
          .select("id, property_id, description, amount, category, incurred_date, properties(name)")
          .eq("owner_id", ownerId)
          .eq("owner_approved", false)
      : Promise.resolve({ data: [] }),
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
      {ownerError ? <p className="text-sm text-rose-700">{ownerError}</p> : null}

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
                        {w.property_id && prop?.name ? (
                          <PropertyLink
                            id={w.property_id}
                            className="text-slate-700 hover:text-[#c4784a] hover:underline"
                          >
                            {prop.name}
                          </PropertyLink>
                        ) : (
                          prop?.name
                        )}{" "}
                        · claimed cost {formatMoney(w.actual_cost)}
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
        {(costs ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">No unapproved costs.</p>
        ) : (
          <ul className="space-y-3">
            {(costs ?? []).map((c) => {
              const prop = Array.isArray(c.properties) ? c.properties[0] : c.properties;
              return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{c.description}</p>
                  <p className="text-xs text-slate-500">
                    {c.property_id && prop?.name ? (
                      <PropertyLink
                        id={c.property_id}
                        className="text-slate-600 hover:text-[#c4784a] hover:underline"
                      >
                        {prop.name}
                      </PropertyLink>
                    ) : null}
                    {prop?.name ? " · " : ""}
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
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
