import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function AdminBillingPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, party_type, status, issue_date, due_date, total, amount_paid, tenants(company_name), owners(company_name)"
    )
    .order("issue_date", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Billing & AR
      </h1>
      <p className="text-slate-600">
        Tenant charges create AR. Collections are agency cash (Due to Owner). Late
        fees: 7-day grace then 5% of base rent.
      </p>
      <Card title="Invoices">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Invoice</th>
                <th className="py-2 pr-3">Party</th>
                <th className="py-2 pr-3">Dates</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Paid</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv) => {
                const tenant = Array.isArray(inv.tenants) ? inv.tenants[0] : inv.tenants;
                const owner = Array.isArray(inv.owners) ? inv.owners[0] : inv.owners;
                return (
                  <tr key={inv.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium">{inv.invoice_number}</td>
                    <td className="py-3 pr-3">
                      {inv.party_type === "tenant"
                        ? tenant?.company_name
                        : owner?.company_name}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      Issued {inv.issue_date}
                      <br />
                      Due {inv.due_date}
                    </td>
                    <td className="py-3 pr-3">{formatMoney(inv.total)}</td>
                    <td className="py-3 pr-3">{formatMoney(inv.amount_paid)}</td>
                    <td className="py-3">
                      <Badge status={inv.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
