import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card } from "@/components/ui";
import { formatMoney, statusClass } from "@/lib/utils";
import {
  adminAssignWorkOrder,
  adminCompleteWorkOrder,
  adminRouteWorkOrder,
} from "@/app/actions/business";
import { AdminWorkOrderNotifyActions } from "@/components/admin-work-order-notify-actions";
import {
  DEMO_CONTRACTOR_VENDOR_ID,
  DEMO_STAFF_VENDOR_ID,
  destinationBadgeClass,
  destinationLabel,
  evaluateWorkOrderRouting,
  firstRelation,
  formatMoneyPlain,
  payorLabel,
  performerLabel,
  routingExplanation,
  workOrderDestination,
} from "@/lib/work-order-routing";

type FilterKey =
  | "all"
  | "emergency"
  | "needs_estimate"
  | "owner"
  | "employee"
  | "assign"
  | "completed";

function filterFromSearch(raw: string | string[] | undefined): FilterKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "emergency" ||
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
      "id, wo_number, wo_type, status, title, description, scheduled_date, estimated_cost, actual_cost, requires_owner_approval, owner_approved_at, vendor_id, completed_at, rejection_reason, tenant_request_id, properties(name, management_agreements(approval_threshold)), vendors(company_name, contact_name, worker_type), tenant_requests(id, title, service_type, tenants(id, company_name))"
    )
    .order("created_at", { ascending: false });

  const enriched = (rows ?? []).map((w) => {
    const prop = firstRelation(w.properties);
    const agreement = firstRelation(prop?.management_agreements);
    const vendor = firstRelation(w.vendors);
    const linkedRequest = firstRelation(w.tenant_requests);
    const linkedTenant = firstRelation(linkedRequest?.tenants);
    const threshold = Number(agreement?.approval_threshold) || 2500;
    const routing = evaluateWorkOrderRouting({
      title: w.title,
      description: w.description,
      woType: w.wo_type,
      estimatedCost: w.estimated_cost,
      actualCost: w.actual_cost,
      approvalThreshold: threshold,
    });
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

    const isStaffJob =
      vendor?.worker_type === "staff" ||
      w.vendor_id === DEMO_STAFF_VENDOR_ID ||
      (!w.requires_owner_approval && Boolean(w.vendor_id));
    const canAdminComplete =
      !w.completed_at &&
      ["open", "assigned", "in_progress"].includes(w.status) &&
      Boolean(w.vendor_id) &&
      isStaffJob &&
      !w.requires_owner_approval;

    const assigneeLabel = vendor?.contact_name
      ? `Assigned to ${vendor.contact_name}`
      : "Unassigned";

    const paidBy =
      w.completed_at || estimate > 0 || w.requires_owner_approval
        ? w.requires_owner_approval
          ? "owner"
          : routing.paidBy === "pending"
            ? "company"
            : routing.paidBy
        : "pending";

    const performer =
      w.requires_owner_approval || routing.performer === "contractor"
        ? vendor?.worker_type === "staff"
          ? "staff"
          : "contractor"
        : vendor?.worker_type === "contractor"
          ? "contractor"
          : estimate > 0
            ? "staff"
            : "pending";

    const isRejected =
      w.status === "rejected" || Boolean(w.rejection_reason);

    return {
      ...w,
      prop,
      vendor,
      linkedRequest,
      linkedTenant,
      threshold,
      destination,
      needsEstimate,
      assigneeLabel,
      canAdminComplete,
      isEmergency: routing.priority === "Emergency",
      isRejected,
      paidBy: paidBy as "owner" | "company" | "pending",
      performer: performer as "staff" | "contractor" | "pending",
      needsAssign:
        (w.status === "approved" && !w.vendor_id && !w.completed_at) ||
        (w.requires_owner_approval &&
          Boolean(w.owner_approved_at) &&
          !w.vendor_id &&
          !w.completed_at),
      explanation: routingExplanation({
        estimatedCost: w.estimated_cost,
        approvalThreshold: threshold,
        status: w.status,
        requiresOwnerApproval: Boolean(w.requires_owner_approval),
        vendorName: vendor?.contact_name ?? vendor?.company_name,
        title: w.title,
        description: w.description,
        woType: w.wo_type,
      }),
    };
  });

  const counts = {
    all: enriched.length,
    emergency: enriched.filter((w) => w.isEmergency).length,
    needs_estimate: enriched.filter((w) => w.needsEstimate).length,
    owner: enriched.filter((w) => w.destination === "property_owner").length,
    employee: enriched.filter((w) => w.destination === "employee").length,
    assign: enriched.filter((w) => w.needsAssign).length,
    completed: enriched.filter((w) => w.destination === "completed").length,
  };

  const visible = enriched.filter((w) => {
    switch (filter) {
      case "emergency":
        return w.isEmergency;
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
    { key: "emergency", label: "Emergency" },
    { key: "needs_estimate", label: "Needs estimate" },
    { key: "owner", label: "With owner" },
    { key: "assign", label: "Ready to assign" },
    { key: "employee", label: "With worker" },
    { key: "completed", label: "Completed" },
  ];

  const chipBase =
    "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition";
  const chipActive = "bg-[#0c1f2e] text-white hover:bg-[#163246]";
  const chipIdle =
    "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900";
  const actionBtn =
    "cursor-pointer rounded px-3 py-1.5 text-xs font-medium transition";

  return (
    <div className="space-y-6">
      <PageHeading
        title="Work Orders"
        vital="Tenant requests auto-assign Harborline staff by specialty when possible. At or below threshold (routine): Jordan Blake / in-house staff — Harborline pays. Above threshold, Emergency/High, or CapEx: owner approval → Victor Chen (contractor) — owner pays."
      />

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
              className={`${chipBase} ${active ? chipActive : chipIdle}`}
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
                      {w.prop?.name} · {w.assigneeLabel}
                      {w.vendor?.worker_type === "staff" && w.vendor.company_name
                        ? ` (${w.vendor.company_name})`
                        : w.vendor &&
                            w.vendor.worker_type !== "staff" &&
                            w.vendor.company_name
                          ? ` · ${w.vendor.company_name}`
                          : ""}{" "}
                      · {w.wo_type.replaceAll("_", " ")} ·{" "}
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
                    <p className="mt-1 text-xs text-slate-600">
                      Performer: {performerLabel(w.performer)} · Payer:{" "}
                      {payorLabel(w.paidBy)}
                    </p>
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
                    {w.status === "assigned" && w.vendor?.contact_name ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass("assigned")}`}
                      >
                        Assigned to {w.vendor.contact_name}
                      </span>
                    ) : (
                      <Badge status={w.status} />
                    )}
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

                {w.isRejected ? (
                  <AdminWorkOrderNotifyActions
                    workOrderId={w.id}
                    woNumber={w.wo_number}
                    title={w.title}
                    propertyName={w.prop?.name}
                    rejectionReason={w.rejection_reason}
                    vendorId={w.vendor_id}
                    tenantId={w.linkedTenant?.id ?? null}
                  />
                ) : null}

                {!w.completed_at &&
                w.status !== "canceled" &&
                w.status !== "pending_owner_approval" &&
                !w.isRejected ? (
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
                        className={`${actionBtn} bg-[#0c1f2e] text-white hover:bg-[#163246]`}
                      >
                        Route by rules
                      </button>
                    </form>

                    {w.needsAssign ? (
                      <form action={adminAssignWorkOrder}>
                        <input type="hidden" name="id" value={w.id} />
                        <input
                          type="hidden"
                          name="vendor_id"
                          value={DEMO_CONTRACTOR_VENDOR_ID}
                        />
                        <button
                          type="submit"
                          className={`${actionBtn} border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50`}
                        >
                          Assign Victor Chen (contractor)
                        </button>
                      </form>
                    ) : null}

                    {w.canAdminComplete ? (
                      <form
                        action={adminCompleteWorkOrder}
                        className="flex flex-wrap items-end gap-2 border-l border-slate-200 pl-3"
                      >
                        <input type="hidden" name="id" value={w.id} />
                        <label className="text-xs text-slate-600">
                          Actual cost
                          <input
                            name="actual_cost"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            defaultValue={
                              Number(w.estimated_cost) > 0
                                ? Number(w.estimated_cost)
                                : 0
                            }
                            className="mt-1 block w-28 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          className={`${actionBtn} bg-emerald-800 text-white hover:bg-emerald-700`}
                        >
                          Confirm staff complete
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
