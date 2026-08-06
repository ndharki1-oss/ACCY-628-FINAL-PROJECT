import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import {
  adminAssignWorkOrder,
  adminRouteWorkOrder,
} from "@/app/actions/business";
import {
  DEMO_EMPLOYEE_VENDOR_ID,
  destinationBadgeClass,
  destinationLabel,
  firstRelation,
  formatMoneyPlain,
  routingExplanation,
  workOrderDestination,
} from "@/lib/work-order-routing";

type FilterKey =
  | "all"
  | "needs_estimate"
  | "owner"
  | "employee"
  | "assign"
  | "completed";

function filterFromSearch(raw: string | string[] | undefined): FilterKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "needs_estimate" ||
    value === "owner" ||
    value === "employee" ||
    value === "assign" ||
    value === "completed"
  ) {
    return value;
  }
  return "all";
}

export default async function AdminWorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireRole(["admin"]);
  const params = (await searchParams) ?? {};
  const filter = filterFromSearch(params.filter);

  const { data: rows } = await supabase
    .from("work_orders")
    .select(
      "id, wo_number, wo_type, status, title, description, scheduled_date, estimated_cost, actual_cost, requires_owner_approval, owner_approved_at, vendor_id, completed_at, rejection_reason, tenant_request_id, properties(name, management_agreements(approval_threshold)), vendors(company_name), tenant_requests(id, title, service_type, tenants(company_name))"
    )
    .order("created_at", { ascending: false });

  const enriched = (rows ?? []).map((w) => {
    const prop = firstRelation(w.properties);
    const agreement = firstRelation(prop?.management_agreements);
    const vendor = firstRelation(w.vendors);
    const linkedRequest = firstRelation(w.tenant_requests);
    const linkedTenant = firstRelation(linkedRequest?.tenants);
    const threshold = Number(agreement?.approval_threshold) || 2500;
    const destination = workOrderDestination({
      status: w.status,
      requiresOwnerApproval: Boolean(w.requires_owner_approval),
      vendorId: w.vendor_id,
      completedAt: w.completed_at,
    });
    const estimate = Number(w.estimated_cost) || 0;
    const needsEstimate =
      !w.completed_at &&
      estimate <= 0 &&
      ["open", "assigned"].includes(w.status) &&
      !w.requires_owner_approval;

    return {
      ...w,
      prop,
      vendor,
      linkedRequest,
      linkedTenant,
      threshold,
      destination,
      needsEstimate,
      needsAssign:
        w.status === "approved" && !w.vendor_id && !w.completed_at,
      explanation: routingExplanation({
        estimatedCost: w.estimated_cost,
        approvalThreshold: threshold,
        status: w.status,
        requiresOwnerApproval: Boolean(w.requires_owner_approval),
        vendorName: vendor?.company_name,
      }),
    };
  });

  const counts = {
    all: enriched.length,
    needs_estimate: enriched.filter((w) => w.needsEstimate).length,
    owner: enriched.filter((w) => w.destination === "property_owner").length,
    employee: enriched.filter((w) => w.destination === "employee").length,
    assign: enriched.filter((w) => w.needsAssign).length,
    completed: enriched.filter((w) => w.destination === "completed").length,
  };

  const visible = enriched.filter((w) => {
    switch (filter) {
      case "needs_estimate":
        return w.needsEstimate;
      case "owner":
        return w.destination === "property_owner";
      case "employee":
        return w.destination === "employee";
      case "assign":
        return w.needsAssign;
      case "completed":
        return w.destination === "completed";
      default:
        return true;
    }
  });

  const chips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "needs_estimate", label: "Needs estimate" },
    { key: "owner", label: "With owner" },
    { key: "assign", label: "Ready to assign" },
    { key: "employee", label: "With employee" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Work Orders
        </h1>
        <p className="mt-1 text-slate-600">
          Set an estimate to route: at or below the property approval threshold →
          employee; above threshold → owner approval first, then you assign.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = filter === chip.key;
          const href =
            chip.key === "all"
              ? "/admin/work-orders"
              : `/admin/work-orders?filter=${chip.key}`;
          return (
            <a
              key={chip.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-[#0c1f2e] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {chip.label} ({counts[chip.key]})
            </a>
          );
        })}
      </div>

      <Card title="All assignments">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-600">No work orders in this view.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((w) => (
              <li key={w.id} className="space-y-3 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {w.wo_number}: {w.title}
                    </p>
                    <p className="text-slate-600">
                      {w.prop?.name} ·{" "}
                      {w.vendor?.company_name ?? "Unassigned"} ·{" "}
                      {w.wo_type.replaceAll("_", " ")} ·{" "}
                      {w.scheduled_date ?? "Unscheduled"}
                    </p>
                    {w.tenant_request_id ? (
                      <p className="mt-1 text-xs font-medium text-[#c4784a]">
                        From tenant maintenance request
                        {w.linkedTenant?.company_name
                          ? ` · ${w.linkedTenant.company_name}`
                          : ""}
                        {w.linkedRequest?.service_type
                          ? ` · ${w.linkedRequest.service_type}`
                          : ""}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">{w.explanation}</p>
                    {w.rejection_reason ? (
                      <p className="mt-1 text-xs text-rose-700">
                        Rejection: {w.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-700">
                      Est. {formatMoney(w.estimated_cost)}
                      {w.actual_cost
                        ? ` · act. ${formatMoney(w.actual_cost)}`
                        : ""}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${destinationBadgeClass(w.destination)}`}
                    >
                      {destinationLabel(w.destination)}
                    </span>
                    <Badge status={w.status} />
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Approval threshold {formatMoneyPlain(w.threshold)}
                  {Number(w.estimated_cost) > 0
                    ? Number(w.estimated_cost) > w.threshold
                      ? " · estimate is above threshold"
                      : " · estimate is at or below threshold"
                    : " · set an estimate to route"}
                </p>

                {!w.completed_at &&
                w.status !== "canceled" &&
                w.status !== "pending_owner_approval" ? (
                  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <form
                      action={adminRouteWorkOrder}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={w.id} />
                      <label className="text-xs text-slate-600">
                        Estimate (USD)
                        <input
                          name="estimated_cost"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          defaultValue={
                            Number(w.estimated_cost) > 0
                              ? Number(w.estimated_cost)
                              : ""
                          }
                          className="mt-1 block w-36 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded bg-[#0c1f2e] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Route by threshold
                      </button>
                    </form>

                    {w.needsAssign ||
                    (w.status === "open" && !w.vendor_id && !w.needsEstimate) ? (
                      <form action={adminAssignWorkOrder}>
                        <input type="hidden" name="id" value={w.id} />
                        <input
                          type="hidden"
                          name="vendor_id"
                          value={DEMO_EMPLOYEE_VENDOR_ID}
                        />
                        <button
                          type="submit"
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
                        >
                          Assign to demo employee
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
