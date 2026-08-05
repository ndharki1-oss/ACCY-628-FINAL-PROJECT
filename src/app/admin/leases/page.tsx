import { requireRole } from "@/lib/auth";
import { Card, Stat } from "@/components/ui";
import {
  AdminLeasesWorkspace,
  type AdminLeaseRow,
} from "@/components/admin-leases-workspace";
import { firstRelation } from "@/lib/work-order-routing";
import { isOccupiedLeaseStatus } from "@/lib/property-portfolio";
import {
  expiresWithinDays,
  isLiveLeaseStatus,
  leaseDisplayStatus,
  leaseHealth,
  leaseOpenBalance,
  monthlyTotal,
  nextRentDueDate,
  paymentStatusLabel,
  renewalStatusLabel,
} from "@/lib/lease-operations";

export default async function AdminLeasesPage() {
  const { supabase } = await requireRole(["admin"]);

  const [
    { data: leases, error: leasesError },
    { data: units },
    { data: occupancyLeases },
    { data: invoices },
    { data: payments },
    { data: paymentApps },
    { data: workOrders },
    { data: deposits },
  ] = await Promise.all([
    supabase
      .from("leases")
      .select(
        "id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, billing_day, security_deposit_required, property_id, unit_id, tenant_id, tenants(id, company_name, contact_name, email, phone), properties(id, name), units(id, unit_code), lease_amendments(id, amendment_type, description, effective_date)"
      )
      .order("lease_number"),
    supabase.from("units").select("id, property_id"),
    supabase.from("leases").select("unit_id, status"),
    supabase
      .from("invoices")
      .select("id, lease_id, tenant_id, status, total, amount_paid, party_type")
      .eq("party_type", "tenant"),
    supabase
      .from("payments")
      .select("id, tenant_id, payment_date, amount, party_type")
      .eq("party_type", "tenant"),
    supabase.from("payment_applications").select("payment_id, invoice_id, amount"),
    supabase.from("work_orders").select("id, lease_id, unit_id, wo_number, status, title"),
    supabase.from("security_deposits").select("lease_id, amount, status"),
  ]);

  if (leasesError) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          Leases
        </h1>
        <Card title="Lease register">
          <p className="text-sm text-rose-700">
            Lease data could not be loaded. Refresh the page or try again shortly.
          </p>
        </Card>
      </div>
    );
  }

  const invoicesByLease = new Map<string, typeof invoices>();
  const invoicesByTenant = new Map<string, NonNullable<typeof invoices>>();
  for (const invoice of invoices ?? []) {
    if (invoice.lease_id) {
      const list = invoicesByLease.get(invoice.lease_id) ?? [];
      list.push(invoice);
      invoicesByLease.set(invoice.lease_id, list);
    }
    if (invoice.tenant_id) {
      const list = invoicesByTenant.get(invoice.tenant_id) ?? [];
      list.push(invoice);
      invoicesByTenant.set(invoice.tenant_id, list);
    }
  }

  const appsByInvoice = new Map<string, typeof paymentApps>();
  for (const app of paymentApps ?? []) {
    const list = appsByInvoice.get(app.invoice_id) ?? [];
    list.push(app);
    appsByInvoice.set(app.invoice_id, list);
  }

  const paymentById = new Map((payments ?? []).map((payment) => [payment.id, payment]));
  const depositByLease = new Map(
    (deposits ?? []).map((deposit) => [deposit.lease_id, deposit])
  );

  const workOrdersByLease = new Map<string, NonNullable<typeof workOrders>>();
  const workOrdersByUnit = new Map<string, NonNullable<typeof workOrders>>();
  for (const wo of workOrders ?? []) {
    if (wo.lease_id) {
      const list = workOrdersByLease.get(wo.lease_id) ?? [];
      list.push(wo);
      workOrdersByLease.set(wo.lease_id, list);
    }
    if (wo.unit_id) {
      const list = workOrdersByUnit.get(wo.unit_id) ?? [];
      list.push(wo);
      workOrdersByUnit.set(wo.unit_id, list);
    }
  }

  const occupiedUnitIds = new Set<string>();
  for (const lease of occupancyLeases ?? []) {
    if (lease.unit_id && isOccupiedLeaseStatus(lease.status)) {
      occupiedUnitIds.add(lease.unit_id);
    }
  }
  const vacantUnits = Math.max((units ?? []).length - occupiedUnitIds.size, 0);

  const tenantsWithBalances = new Set<string>();
  for (const [tenantId, tenantInvoices] of invoicesByTenant) {
    if (leaseOpenBalance(tenantInvoices) > 0) tenantsWithBalances.add(tenantId);
  }

  const rows: AdminLeaseRow[] = (leases ?? []).map((lease) => {
    const tenant = firstRelation(lease.tenants);
    const property = firstRelation(lease.properties);
    const unit = firstRelation(lease.units);
    const amendments = Array.isArray(lease.lease_amendments)
      ? lease.lease_amendments
      : lease.lease_amendments
        ? [lease.lease_amendments]
        : [];
    const hasRenewalAmendment = amendments.some(
      (amendment) => amendment.amendment_type === "renewal"
    );
    const leaseInvoices = invoicesByLease.get(lease.id) ?? [];
    const balance = leaseOpenBalance(leaseInvoices);
    const monthTotal = monthlyTotal(lease.base_rent_monthly, lease.cam_monthly);
    const hasOverdueInvoice = leaseInvoices.some(
      (invoice) => invoice.status === "overdue"
    );
    const relatedWorkOrders = [
      ...(workOrdersByLease.get(lease.id) ?? []),
      ...((lease.unit_id ? workOrdersByUnit.get(lease.unit_id) : []) ?? []),
    ].filter(
      (wo, index, list) => list.findIndex((item) => item.id === wo.id) === index
    );

    let lastPayment: { date: string; amount: number } | null = null;
    for (const invoice of leaseInvoices) {
      for (const app of appsByInvoice.get(invoice.id) ?? []) {
        const payment = paymentById.get(app.payment_id);
        if (!payment) continue;
        if (!lastPayment || payment.payment_date > lastPayment.date) {
          lastPayment = {
            date: payment.payment_date,
            amount: Number(payment.amount),
          };
        }
      }
    }

    const deposit = depositByLease.get(lease.id);

    return {
      id: lease.id,
      leaseNumber: lease.lease_number,
      tenantId: lease.tenant_id,
      tenantName: tenant?.company_name ?? "—",
      tenantContactName: tenant?.contact_name ?? null,
      tenantEmail: tenant?.email ?? null,
      tenantPhone: tenant?.phone ?? null,
      propertyId: lease.property_id,
      propertyName: property?.name ?? "—",
      unitCode: unit?.unit_code ?? "—",
      leaseType: lease.lease_type,
      dbStatus: lease.status,
      displayStatus: leaseDisplayStatus(lease.status, lease.end_date),
      startDate: lease.start_date,
      endDate: lease.end_date,
      baseRent: Number(lease.base_rent_monthly),
      cam: Number(lease.cam_monthly),
      monthlyTotal: monthTotal,
      balance,
      billingDay: lease.billing_day,
      nextRentDue: nextRentDueDate(lease.billing_day),
      securityDeposit: Number(deposit?.amount ?? lease.security_deposit_required ?? 0),
      securityDepositStatus: deposit?.status ?? null,
      renewalStatus: renewalStatusLabel({
        status: lease.status,
        endDate: lease.end_date,
        hasRenewalAmendment,
      }),
      health: leaseHealth({
        status: lease.status,
        endDate: lease.end_date,
        balance,
        monthlyAmount: monthTotal,
        hasOverdueInvoice,
        hasRenewalPending: lease.status === "renewal_pending",
        hasRenewalAmendment,
      }),
      paymentStatus: paymentStatusLabel(leaseInvoices),
      lastPaymentDate: lastPayment?.date ?? null,
      lastPaymentAmount: lastPayment?.amount ?? null,
      maintenanceCount: relatedWorkOrders.length,
      amendments: amendments.map((amendment) => ({
        id: amendment.id,
        type: amendment.amendment_type,
        effectiveDate: amendment.effective_date,
        description: amendment.description,
      })),
    };
  });

  const activeLeases = rows.filter((row) => isLiveLeaseStatus(row.dbStatus)).length;
  const expiringSoon = rows.filter(
    (row) =>
      isLiveLeaseStatus(row.dbStatus) && expiresWithinDays(row.endDate, 90)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          Leases
        </h1>
        <p className="mt-1 text-slate-600">
          Operational lease register for daily property-management work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active Leases" value={String(activeLeases)} />
        <Stat label="Leases Expiring Within 90 Days" value={String(expiringSoon)} />
        <Stat label="Vacant Units" value={String(vacantUnits)} />
        <Stat
          label="Tenants With Outstanding Balances"
          value={String(tenantsWithBalances.size)}
        />
      </div>

      <Card title="Lease register">
        <AdminLeasesWorkspace leases={rows} />
      </Card>
    </div>
  );
}
