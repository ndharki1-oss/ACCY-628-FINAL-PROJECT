import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { AdminBillingTable } from "@/components/admin-billing-table";
import {
  buildPaymentDetails,
  type BillingInvoiceRow,
} from "@/lib/billing-payments";

export default async function AdminBillingPage() {
  const { supabase } = await requireRole(["admin"]);

  const [{ data: invoices }, { data: payments }, { data: paymentApps }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, party_type, status, issue_date, due_date, total, amount_paid, tenants(company_name), owners(company_name)"
        )
        .order("issue_date", { ascending: false }),
      supabase
        .from("payments")
        .select(
          "id, payment_number, payment_date, amount, method, is_auto_pay, reference"
        ),
      supabase
        .from("payment_applications")
        .select("id, payment_id, invoice_id, amount"),
    ]);

  const paymentById = new Map(
    (payments ?? []).map((payment) => [payment.id, payment])
  );

  const appsByInvoice = new Map<string, NonNullable<typeof paymentApps>>();
  for (const app of paymentApps ?? []) {
    const list = appsByInvoice.get(app.invoice_id) ?? [];
    list.push(app);
    appsByInvoice.set(app.invoice_id, list);
  }

  const rows: BillingInvoiceRow[] = (invoices ?? []).map((inv) => {
    const tenant = Array.isArray(inv.tenants) ? inv.tenants[0] : inv.tenants;
    const owner = Array.isArray(inv.owners) ? inv.owners[0] : inv.owners;
    const partyName =
      inv.party_type === "tenant"
        ? tenant?.company_name ?? "—"
        : owner?.company_name ?? "—";

    const relatedApps = appsByInvoice.get(inv.id) ?? [];
    const paymentDetails = buildPaymentDetails(
      inv.due_date,
      relatedApps.flatMap((app) => {
        const payment = paymentById.get(app.payment_id);
        if (!payment) return [];
        return [
          {
            id: `${app.id}-${payment.id}`,
            paymentNumber: payment.payment_number,
            paymentDate: payment.payment_date,
            amount: Number(payment.amount),
            appliedAmount: Number(app.amount),
            method: payment.method,
            isAutoPay: Boolean(payment.is_auto_pay),
            reference: payment.reference,
          },
        ];
      })
    );

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      partyName,
      partyType: inv.party_type,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      total: Number(inv.total),
      amountPaid: Number(inv.amount_paid),
      status: inv.status,
      payments: paymentDetails,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Billing & AR
      </h1>
      <p className="text-slate-600">
        Tenant charges create AR. Collections are agency cash (Due to Owner). Late
        fees: 7-day grace then 5% of base rent. Click an invoice number for payment
        method, date, and timing.
      </p>
      <Card title="Invoices">
        <AdminBillingTable invoices={rows} />
      </Card>
    </div>
  );
}
