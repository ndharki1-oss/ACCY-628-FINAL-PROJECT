import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { tenantPayInvoice } from "@/app/actions/business";
import { TenantAutoPayForm } from "./auto-pay-form";

export default async function TenantPaymentsPage() {
  const { supabase, user } = await requireRole(["tenant"]);
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, company_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  const tenant =
    tenantRow ??
    (await supabase.from("tenants").select("id, company_name").limit(1).single())
      .data;
  const tenantId = tenant?.id;

  const [{ data: invoices }, { data: autoPay }, { data: lease }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*, invoice_lines(line_type, description, amount)")
        .eq("tenant_id", tenantId!)
        .order("due_date", { ascending: false }),
      supabase
        .from("auto_pay_settings")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle(),
      supabase
        .from("leases")
        .select("properties(address_line1, city, state, postal_code)")
        .eq("tenant_id", tenantId!)
        .in("status", ["active", "renewal_pending"])
        .limit(1)
        .maybeSingle(),
    ]);

  const prop = Array.isArray(lease?.properties)
    ? lease?.properties[0]
    : lease?.properties;
  const businessAddress = prop
    ? `${tenant?.company_name ? `${tenant.company_name} · ` : ""}${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.postal_code}`
    : (tenant?.company_name ?? "Business address on file");

  const openInvoices = (invoices ?? []).filter((inv) =>
    ["sent", "partial", "overdue", "disputed", "draft"].includes(inv.status)
  );
  const pastInvoices = (invoices ?? []).filter((inv) =>
    ["paid", "void"].includes(inv.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Payments
        </h1>
        <p className="text-slate-600">
          Pay open balances and review your past invoices.
        </p>
      </div>

      <Card title="Auto-pay (simulated ACH)">
        <p className="mb-3 text-sm text-slate-600">
          No real payment processor — toggles demo auto-draft preference.
        </p>
        <TenantAutoPayForm
          enabled={Boolean(autoPay?.enabled)}
          businessAddress={businessAddress}
        />
      </Card>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
          Open balance
        </h2>
        {openInvoices.length === 0 ? (
          <Card title="No open invoices">
            <p className="text-sm text-slate-600">
              You have nothing due right now.
            </p>
          </Card>
        ) : (
          openInvoices.map((inv) => {
            const due = Number(inv.total) - Number(inv.amount_paid);
            const lines =
              (inv.invoice_lines as {
                line_type: string;
                description: string;
                amount: number;
              }[]) ?? [];
            return (
              <Card
                key={inv.id}
                title={inv.invoice_number}
                action={<Badge status={inv.status} />}
              >
                <p className="text-sm text-slate-600">
                  Issued {inv.issue_date} · Due {inv.due_date} · Total{" "}
                  {formatMoney(inv.total)} · Paid {formatMoney(inv.amount_paid)}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {lines.map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        [{l.line_type}] {l.description}
                      </span>
                      <span>{formatMoney(l.amount)}</span>
                    </li>
                  ))}
                </ul>
                {due > 0 &&
                !["void", "disputed", "draft"].includes(inv.status) ? (
                  <form
                    action={tenantPayInvoice}
                    className="mt-4 flex flex-wrap gap-2"
                  >
                    <input type="hidden" name="invoice_id" value={inv.id} />
                    <input type="hidden" name="amount" value={due} />
                    <input
                      type="hidden"
                      name="auto_pay"
                      value={autoPay?.enabled ? "true" : "false"}
                    />
                    <button
                      type="submit"
                      className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white"
                    >
                      Pay {formatMoney(due)} (simulate)
                    </button>
                  </form>
                ) : null}
                {inv.status === "disputed" ? (
                  <p className="mt-2 text-sm text-rose-700">
                    Dispute: {inv.dispute_reason}
                  </p>
                ) : null}
              </Card>
            );
          })
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
          Past Invoices
        </h2>
        {pastInvoices.length === 0 ? (
          <Card title="No past invoices">
            <p className="text-sm text-slate-600">
              Paid and voided invoices will appear here.
            </p>
          </Card>
        ) : (
          pastInvoices.map((inv) => {
            const lines =
              (inv.invoice_lines as {
                line_type: string;
                description: string;
                amount: number;
              }[]) ?? [];
            return (
              <Card
                key={inv.id}
                title={inv.invoice_number}
                action={<Badge status={inv.status} />}
              >
                <p className="text-sm text-slate-600">
                  Issued {inv.issue_date} · Due {inv.due_date} · Total{" "}
                  {formatMoney(inv.total)} · Paid {formatMoney(inv.amount_paid)}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {lines.map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        [{l.line_type}] {l.description}
                      </span>
                      <span>{formatMoney(l.amount)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
