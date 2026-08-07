import { requireRole } from "@/lib/auth";
import { Badge, Card, Stat } from "@/components/ui";
import { WorkOrderDetailsButton } from "@/components/admin-work-order-details";
import {
  FeeRevenueRecognizedCard,
  type FeeRevenueLine,
} from "@/components/admin-fee-revenue-breakdown";
import { AdminDashboardCharts } from "@/components/admin-dashboard-charts";
import { PropertyLocationsMap } from "@/components/property-locations-map";
import { formatMoney } from "@/lib/utils";
import {
  evaluateWorkOrderRouting,
  firstRelation,
  requiresImmediateManagementAttention,
  type Priority,
} from "@/lib/work-order-routing";
import { buildMgmtPnlMonthlySeries } from "@/lib/reports/mgmt-pnl-monthly";
import { fetchPropertyPnLChartActivity } from "@/lib/reports/data";
import { buildGlFeeRevenueLines } from "@/lib/admin-fee-revenue-gl";
import Link from "next/link";

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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

function ActionCenterRow({
  label,
  count,
  tone,
  href,
}: {
  label: string;
  count: number;
  tone: "rose" | "amber" | "sky" | "slate";
  href: string;
}) {
  const dots: Record<typeof tone, string> = {
    rose: "bg-rose-600",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    slate: "bg-slate-500",
  };

  return (
    <li className="flex flex-1 items-center justify-between gap-3 border-b border-slate-100 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dots[tone]}`} />
        <span className="truncate text-sm text-[#0c1f2e]">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-[family-name:var(--font-display)] text-sm text-[#0c1f2e]">
          {count}
        </span>
        <Link href={href} className="text-sm text-[#c4784a] hover:underline">
          View
        </Link>
      </div>
    </li>
  );
}

export default async function AdminDashboard() {
  const { supabase } = await requireRole(["admin"]);

  const today = new Date();
  const in6Months = new Date(today);
  in6Months.setMonth(today.getMonth() + 6);
  const todayStr = today.toISOString().slice(0, 10);
  const in6MonthsStr = in6Months.toISOString().slice(0, 10);

  const [
    { count: owners },
    { count: properties },
    { count: leases },
    { data: invoices },
    { data: pendingWo },
    { data: fees },
    { data: feeStatementLines },
    { count: expiringLeases },
    { count: upcomingInspections },
    { data: mapProperties },
    { data: mapUnits },
    { data: mapLeases },
    { data: mapWorkOrders },
  ] = await Promise.all([
    supabase.from("owners").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase
      .from("leases")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "renewal_pending"]),
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
      .select(
        "id, credit, property_id, owner_id, owners(company_name), properties(name), journal_entries!inner(entry_date, entry_number, memo), gl_accounts!inner(code)"
      )
      .eq("gl_accounts.code", "4000")
      .gt("credit", 0),
    supabase
      .from("owner_statement_lines")
      .select(
        "id, line_type, description, amount, owner_statements!inner(statement_number, period_start, period_end, properties(name), owners(company_name))"
      )
      .in("line_type", [
        "management_fee",
        "leasing_commission",
        "project_fee",
        "renewal_fee",
        "late_fee_retained",
      ]),
    supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "renewal_pending"])
      .gte("end_date", todayStr)
      .lte("end_date", in6MonthsStr),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("wo_type", "inspection")
      .in("status", ["open", "assigned", "in_progress"]),
    supabase
      .from("properties")
      .select(
        "id, name, address_line1, city, state, postal_code, latitude, longitude, owners(contact_name, company_name)"
      )
      .order("name"),
    supabase.from("units").select("id, property_id"),
    supabase.from("leases").select("property_id, unit_id, status").in("status", [
      "active",
      "renewal_pending",
    ]),
    supabase
      .from("work_orders")
      .select("property_id, status")
      .in("status", ["open", "assigned", "in_progress", "pending_owner_approval"]),
  ]);

  const [
    chartActivity,
    { data: mgmtFeeLines },
    { data: companyExp },
    { data: companyCosts },
    { data: laborCosts },
  ] = await Promise.all([
    fetchPropertyPnLChartActivity(supabase, { mode: "full" }),
    supabase
      .from("journal_lines")
      .select(
        "credit, gl_accounts!inner(code), journal_entries!inner(entry_date)"
      )
      .eq("gl_accounts.code", "4000"),
    supabase.from("company_expenses").select("amount, incurred_date"),
    supabase
      .from("cost_entries")
      .select("amount, incurred_date, paid_by")
      .eq("paid_by", "company"),
    supabase.from("labor_time_entries").select("labor_cost, work_date"),
  ]);

  const monthlySeries = buildMgmtPnlMonthlySeries({
    feeLines: (mgmtFeeLines ?? []).map((row) => {
      const entry = firstRel(
        row.journal_entries as
          | { entry_date: string }
          | { entry_date: string }[]
          | null
      );
      return { credit: Number(row.credit), entryDate: entry?.entry_date };
    }),
    companyExpenses: (companyExp ?? []).map((row) => ({
      amount: Number(row.amount),
      incurredDate: row.incurred_date,
    })),
    companyPaidCosts: (companyCosts ?? []).map((row) => ({
      amount: Number(row.amount),
      incurredDate: row.incurred_date,
    })),
    laborCosts: (laborCosts ?? []).map((row) => ({
      amount: Number(row.labor_cost),
      workDate: row.work_date,
    })),
    selectedPeriod: null,
  });

  const arOpen = (invoices ?? []).reduce(
    (s, i) => s + Number(i.total) - Number(i.amount_paid),
    0
  );
  const feeRevenue = (fees ?? []).reduce((s, r) => s + Number(r.credit), 0);

  const statementSlices = (feeStatementLines ?? [])
    .filter((row) => String(row.line_type) === "management_fee")
    .map((row) => {
    const statement = firstRelation(row.owner_statements);
    const owner = firstRelation(statement?.owners);
    const property = firstRelation(statement?.properties);
    return {
      id: row.id,
      amount: Math.abs(Number(row.amount)),
      ownerName: owner?.company_name ?? "Unassigned owner",
      propertyName: property?.name ?? "Unassigned property",
      statementNumber: statement?.statement_number ?? "—",
      periodStart: statement?.period_start ?? "",
      periodEnd: statement?.period_end ?? "",
      feeType: String(row.line_type),
      description: row.description ?? String(row.line_type),
    };
  });

  const feeLines: FeeRevenueLine[] = buildGlFeeRevenueLines(
    (fees ?? []).map((row) => {
      const entry = firstRelation(row.journal_entries);
      const owner = firstRelation(row.owners);
      const property = firstRelation(row.properties);
      return {
        id: row.id,
        credit: Number(row.credit),
        ownerName: owner?.company_name ?? null,
        propertyName: property?.name ?? null,
        entryDate: entry?.entry_date ?? null,
        entryNumber: entry?.entry_number ?? null,
        memo: entry?.memo ?? null,
      };
    }),
    statementSlices
  );
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

  const unitsByProperty = new Map<string, number>();
  for (const unit of mapUnits ?? []) {
    unitsByProperty.set(unit.property_id, (unitsByProperty.get(unit.property_id) ?? 0) + 1);
  }

  const leasedUnitsByProperty = new Map<string, Set<string>>();
  for (const lease of mapLeases ?? []) {
    if (!lease.unit_id) continue;
    const set = leasedUnitsByProperty.get(lease.property_id) ?? new Set<string>();
    set.add(lease.unit_id);
    leasedUnitsByProperty.set(lease.property_id, set);
  }

  const openWoByProperty = new Map<string, number>();
  for (const wo of mapWorkOrders ?? []) {
    openWoByProperty.set(
      wo.property_id,
      (openWoByProperty.get(wo.property_id) ?? 0) + 1
    );
  }

  const propertyMarkers = (mapProperties ?? []).flatMap((property) => {
    const latitude = Number(property.latitude);
    const longitude = Number(property.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

    const owner = firstRelation(property.owners);
    const unitCount = unitsByProperty.get(property.id) ?? 0;
    const leasedCount = leasedUnitsByProperty.get(property.id)?.size ?? 0;

    return [
      {
        id: property.id,
        name: property.name,
        address: `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}`,
        ownerName:
          owner?.contact_name || owner?.company_name
            ? [owner.contact_name, owner.company_name].filter(Boolean).join(" · ")
            : "—",
        latitude,
        longitude,
        occupancyRate: unitCount > 0 ? leasedCount / unitCount : null,
        openWorkOrders: openWoByProperty.get(property.id) ?? 0,
      },
    ];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
          Admin Workspace
        </h1>
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
          <Link
            href="/admin/work-orders?filter=emergency"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#0c1f2e] px-4 py-2 text-sm font-medium text-[#f3efe6] hover:bg-[#16384f]"
          >
            View Work Orders
          </Link>
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

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-4">
          <FeeRevenueRecognizedCard total={feeRevenue} lines={feeLines} />

          <Card
            title="Manager Action Center"
            className="flex min-h-0 flex-1 flex-col"
          >
            <ul className="flex min-h-0 flex-1 flex-col justify-evenly">
              {(
                [
                  {
                    key: "emergency-wos",
                    label: "Emergency work orders requiring review",
                    count: pendingDetails.filter((w) => w.priority === "Emergency")
                      .length,
                    tone: "rose" as const,
                    href: "/admin/work-orders?filter=emergency",
                  },
                  {
                    key: "vendor-approvals",
                    label: "Work orders awaiting owner approval",
                    count: pendingDetails.length,
                    tone: "amber" as const,
                    href: "/admin/work-orders?filter=owner",
                  },
                  {
                    key: "expiring-leases",
                    label: "Leases expiring within 6 months",
                    count: expiringLeases ?? 0,
                    tone: "sky" as const,
                    href: "/admin/leases",
                  },
                  {
                    key: "overdue-ar",
                    label: "Overdue tenant balances needing follow-up",
                    count: overdue.length,
                    tone: "rose" as const,
                    href: "/admin/billing",
                  },
                  {
                    key: "inspections",
                    label: "Upcoming property inspections",
                    count: upcomingInspections ?? 0,
                    tone: "slate" as const,
                    href: "/admin/work-orders",
                  },
                ] as const
              ).map((row) => (
                <ActionCenterRow
                  key={row.key}
                  label={row.label}
                  count={row.count}
                  tone={row.tone}
                  href={row.href}
                />
              ))}
            </ul>
          </Card>
        </div>

        <div id="unapproved-work-risk" className="flex min-h-0 scroll-mt-6 flex-col">
          <Card
            title="Unapproved Work/ Spend Risk"
            className="flex h-full min-h-0 flex-col"
          >
            {pendingDetails.length === 0 ? (
              <p className="text-sm text-slate-600">
                No WOs awaiting owner approval.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-[15px]">
                {pendingDetails.map((w) => (
                  <li key={w.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <p className="text-base font-medium text-[#0c1f2e]">
                      {w.woNumber}: {w.title}
                    </p>
                    {w.description ? (
                      <p className="text-sm text-slate-600">{w.description}</p>
                    ) : null}
                    <p className="text-sm text-slate-500">{w.propertyName}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <PriorityBadge priority={w.priority} />
                      <span className="text-[#0c1f2e]">
                        {formatMoney(w.displayAmount)}
                      </span>
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

      <AdminDashboardCharts
        monthlySeries={monthlySeries}
        chartActivity={chartActivity}
      />

      <Card title="Property Locations">
        <div className="h-[320px] sm:h-[380px]">
          <PropertyLocationsMap markers={propertyMarkers} />
        </div>
      </Card>
    </div>
  );
}
