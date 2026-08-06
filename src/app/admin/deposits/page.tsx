import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import {
  AdminDepositsWorkspace,
  type AdminDepositRow,
} from "@/components/admin-deposits-workspace";
import { firstRelation } from "@/lib/work-order-routing";

export default async function AdminDepositsPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data: deposits } = await supabase
    .from("security_deposits")
    .select(
      "id, amount, status, notes, received_date, property_id, lease_id, properties(name), tenants(company_name), leases(lease_number), security_deposit_events(id, event_type, amount, description, occurred_on, created_at)"
    )
    .order("received_date", { ascending: false });

  const rows: AdminDepositRow[] = (deposits ?? []).map((d) => {
    const property = firstRelation(d.properties);
    const tenant = firstRelation(d.tenants);
    const lease = firstRelation(d.leases);
    const events = [...(d.security_deposit_events ?? [])].sort((a, b) =>
      String(b.occurred_on).localeCompare(String(a.occurred_on))
    );
    const applied = events
      .filter((e) => e.event_type === "applied")
      .reduce((s, e) => s + Number(e.amount), 0);
    const refunded = events
      .filter((e) => e.event_type === "refunded")
      .reduce((s, e) => s + Number(e.amount), 0);
    return {
      id: d.id,
      amount: Number(d.amount),
      status: d.status,
      notes: d.notes,
      received_date: d.received_date,
      propertyName: property?.name ?? "Property",
      tenantName: tenant?.company_name ?? "Tenant",
      leaseNumber: lease?.lease_number ?? "—",
      events: events.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        amount: Number(e.amount),
        description: e.description,
        occurred_on: e.occurred_on,
      })),
      applied,
      refunded,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Security Deposits"
        vital="Use disposition on a held deposit to demo applied damages + refund (writes ledger events; does not delete seed)."
        info="Escrow ledger for tenant deposits."
      />

      <AdminDepositsWorkspace rows={rows} />
    </div>
  );
}
