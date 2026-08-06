import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import {
  getStripePublishableKey,
  isStripeConfigured,
} from "@/lib/payments/stripe";
import { formatMoney } from "@/lib/utils";
import { AutomatedPaymentsToggle } from "./automated-payments-toggle";
import { InvoicesByProperty } from "./invoices-by-property";
import { PayByProperty } from "./pay-by-property";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  total: number | string;
  amount_paid: number | string;
  dispute_reason?: string | null;
  property_id: string | null;
  invoice_lines:
    | { line_type: string; description: string; amount: number }[]
    | null;
  properties:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

function propertyFromInvoice(inv: InvoiceRow) {
  const raw = inv.properties;
  const prop = Array.isArray(raw) ? raw[0] : raw;
  return {
    id: prop?.id ?? inv.property_id ?? "unknown",
    name: prop?.name ?? "Unknown property",
  };
}

function isPayable(inv: InvoiceRow) {
  const due = Number(inv.total) - Number(inv.amount_paid);
  return due > 0 && !["void", "disputed", "draft"].includes(inv.status);
}

export default async function TenantPaymentsPage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId, error: tenantError } = await getLinkedTenantId(
    supabase,
    user
  );

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            View & Pay Invoices
          </h1>
          <p className="text-sm text-rose-700">
            {tenantError ?? "This login is not linked to a tenant record."}
          </p>
        </div>
      </div>
    );
  }

  const [{ data: invoices }, { data: autoPay }, { data: leases }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "*, invoice_lines(line_type, description, amount), properties(id, name)"
        )
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false }),
      supabase
        .from("auto_pay_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("leases")
        .select("property_id, properties(id, name)")
        .eq("tenant_id", tenantId),
    ]);

  const autoPayEnabled = Boolean(autoPay?.enabled);
  const stripeConfigured = isStripeConfigured();
  const stripePublishableKey = getStripePublishableKey();
  const rows = (invoices ?? []) as InvoiceRow[];

  const byProperty = new Map<
    string,
    { id: string; name: string; invoices: InvoiceRow[] }
  >();

  for (const lease of leases ?? []) {
    const raw = lease.properties as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
    const prop = Array.isArray(raw) ? raw[0] : raw;
    const id = prop?.id ?? lease.property_id;
    if (!id || byProperty.has(id)) continue;
    byProperty.set(id, {
      id,
      name: prop?.name ?? "Unknown property",
      invoices: [],
    });
  }

  for (const inv of rows) {
    const prop = propertyFromInvoice(inv);
    const existing = byProperty.get(prop.id);
    if (existing) {
      existing.invoices.push(inv);
    } else {
      byProperty.set(prop.id, {
        id: prop.id,
        name: prop.name,
        invoices: [inv],
      });
    }
  }

  const propertyGroups = [...byProperty.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      id: g.id,
      name: g.name,
      invoices: [...g.invoices].sort((a, b) => {
        const overdueRank = (status: string) => (status === "overdue" ? 0 : 1);
        const rankDiff = overdueRank(a.status) - overdueRank(b.status);
        if (rankDiff !== 0) return rankDiff;
        return String(b.due_date).localeCompare(String(a.due_date));
      }),
    }));

  const payableInvoices = rows.filter(isPayable).map((inv) => {
    const prop = propertyFromInvoice(inv);
    const due = Number(inv.total) - Number(inv.amount_paid);
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      due,
      dueLabel: formatMoney(due),
      propertyId: prop.id,
    };
  });

  const payProperties = propertyGroups.map((g) => ({
    id: g.id,
    name: g.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          View & Pay Invoices
        </h1>
      </div>

      <AutomatedPaymentsToggle enabled={autoPayEnabled} />

      <PayByProperty
        properties={payProperties}
        invoices={payableInvoices}
        autoPayEnabled={autoPayEnabled}
        stripeConfigured={stripeConfigured}
        stripePublishableKey={stripePublishableKey}
      />

      <InvoicesByProperty propertyGroups={propertyGroups} />
    </div>
  );
}
