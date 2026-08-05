import { requireRole } from "@/lib/auth";
import { Badge, Card, Stat } from "@/components/ui";
import { WorkOrderDetailsButton } from "@/components/admin-work-order-details";
import { formatMoney } from "@/lib/utils";
import {
  evaluateWorkOrderRouting,
  firstRelation,
  requiresImmediateManagementAttention,
  type Priority,
} from "@/lib/work-order-routing";
import Link from "next/link";

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    Emergency: "bg-rose-100 text-rose-800",
    High: "bg-amber-100 text-amber-900",
    Medium: "bg-sky-100 text-sky-800",
    Low: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

export default async function AdminDashboard() {
  const { supabase } = await requireRole(["admin"]);

  const [
    { count: owners },
    { count: properties },
    { count: leases },
    { data: invoices },
    { data: pendingWo },
    { data: fees },
    { data: periods },
  ] = await Promise.all([
    supabase.from("owners").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("leases").select("*", { count: "exact", head: true }),
    supabase
      .from("invoices")
      .select("id, total, amount_paid, status, due_date, invoice_number")
      .eq("party_type", "tenant")
      .in("status", ["sent", "partial", "overdue", "disputed"]),
    supabase
      .from("work_orders")
      .select(
        "id, wo_number, title, description, status, wo_type, estimated_cost, actual_cost, created_at, properties(name, management_agreements(approval_threshold)), units(unit_code), vendors(company_name), leases(tenants(company_name, contact_name))"
      )
      .eq("status", "pending_owner_approval"),
    supabase
      .from("journal_lines")
      .select("credit, gl_accounts!inner(code)")
      .eq("gl_accounts.code", "4000"),
    supabase
      .from("accounting_periods")
      .select("id, year, month, status")
      .eq("status", "open")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(3),
  ]);

  const arOpen = (invoices ?? []).reduce(
    (s, i) => s + Number(i.total) - Number(i.amount_paid),
    0
  );
  const feeRevenue = (fees ?? []).reduce((s, r) => s + Number(r.credit), 0);
  const overdue = (invoices ?? []).filter((i) => i.status === "overdue");

  const pendingDetails = (pendingWo ?? []).map((w) => {
    const property = firstRelation(w.properties);
    const agreement = firstRelation(property?.management_agreements);
    const unit = firstRelation(w.units);
    const vendor = firstRelation(w.vendors);
    const lease = firstRelation(w.leases);
    const tenant = firstRelation(lease?.tenants);
    const routing = evaluateWorkOrderRouting({
      title: w.title,
      description: w.description,
      woType: w.wo_type,
      estimatedCost: w.estimated_cost,
      actualCost: w.actual_cost,
      approvalThreshold: agreement?.approval_threshold,
    });
    const tenantOrSuite = [tenant?.company_name, unit?.unit_code]
      .filter(Boolean)
      .join(" · ");

    return {
      id: w.id,
      woNumber: w.wo_number,
      title: w.title,
      description: w.description,
      propertyName: property?.name ?? "Unknown property",
      tenantOrSuite: tenantOrSuite || null,
      priority: routing.priority,
      estimatedCost: routing.estimatedCost,
      displayAmount: routing.displayAmount,
      submittedAt: w.created_at
        ? new Date(w.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Not recorded",
      requestedBy: tenant?.contact_name
        ? `${tenant.contact_name}${tenant.company_name ? ` (${tenant.company_name})` : ""}`
        : tenant?.company_name ?? "Not recorded",
      vendorName: vendor?.company_name ?? null,
      status: w.status,
      managementReviewRequired: routing.managementReviewRequired,
      reviewReasons: routing.reviewReasons,
      routingLabel: routing.routingLabel,
      needsImmediateAttention: requiresImmediateManagementAttention(routing),
    };
  });

  const alertWorkOrders = pendingDetails.filter((w) => w.needsImmediateAttention);
  const alertCount = alertWorkOrders.length;
  const emergencyCount = alertWorkOrders.filter(
    (w) => w.priority === "Emergency"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          Admin workspace
        </h1>
        <p className="mt-1 text-slate-600">
          Contract-to-cash controls, AR, fee revenue, and period close.
        </p>
      </div>

      {alertCount > 0 ? (
        <div className="flex flex-col gap-4 rounded-lg border border-rose-800/15 bg-rose-50 px-4 py-4 text-rose-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-700 text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M6 3.75v16.5h1.5V14.4l.7.3c1.66.7 3.5.7 5.16 0l.28-.12c1.38-.58 2.9-.58 4.28 0l1.08.46V4.9l-.78-.33c-1.66-.7-3.5-.7-5.16 0l-.28.12c-1.38.58-2.9.58-4.28 0L7.5 4.23V3.75H6Z" />
              </svg>
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg text-rose-900">
                Immediate Management Attention Required
              </p>
              <p className="mt-1 text-sm text-rose-900/90">
                {emergencyCount === alertCount
                  ? `${alertCount} emergency work order${alertCount === 1 ? "" : "s"} require management review before they can proceed.`
                  : `${alertCount} work order${alertCount === 1 ? "" : "s"} require management review before they can proceed.`}
              </p>
              <p className="mt-1 text-sm text-rose-800/80">
                High-priority repairs or work exceeding the approval threshold
                should be reviewed as soon as possible.
              </p>
            </div>
          </div>
          <a
            href="#unapproved-work-risk"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#0c1f2e] px-4 py-2 text-sm font-medium text-[#f3efe6] hover:bg-[#16384f]"
          >
            View Work Orders
          </a>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Owners" value={String(owners ?? 0)} />
        <Stat label="Properties" value={String(properties ?? 0)} />
        <Stat label="Active portfolio leases" value={String(leases ?? 0)} />
        <Stat
          label="Open tenant AR"
          value={formatMoney(arOpen)}
          hint={`${overdue.length} overdue`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Fee revenue recognized (GAAP: on collection)"
          action={
            <Link href="/admin/accounting" className="text-sm text-[#c4784a]">
              Journals →
            </Link>
          }
        >
          <p className="font-[family-name:var(--font-display)] text-3xl">
            {formatMoney(feeRevenue)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Management fees credit account 4000 only when rent is collected
            (agency model — rent itself is Due to Owner, not Harborline revenue).
          </p>
        </Card>

        <div id="unapproved-work-risk" className="scroll-mt-6">
        <Card title="Unapproved work / spend risk">
          {pendingDetails.length === 0 ? (
            <p className="text-sm text-slate-600">No WOs awaiting owner approval.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pendingDetails.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#0c1f2e]">
                      {w.woNumber}: {w.title}
                    </p>
                    {w.description ? (
                      <p className="mt-0.5 text-slate-600">{w.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">{w.propertyName}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PriorityBadge priority={w.priority} />
                    <span className="text-[#0c1f2e]">{formatMoney(w.displayAmount)}</span>
                    <Badge status={w.status} />
                    <WorkOrderDetailsButton detail={w} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        </div>
      </div>

      <Card title="Period close checklist">
        <ul className="space-y-2 text-sm">
          {(periods ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>
                {p.year}-{String(p.month).padStart(2, "0")}
              </span>
              <Badge status={p.status} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Closed periods block backdated postings without admin override + audit.
        </p>
      </Card>
    </div>
  );
}
