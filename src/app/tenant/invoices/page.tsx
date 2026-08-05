import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import {
  getStripePublishableKey,
  isStripeConfigured,
} from "@/lib/payments/stripe";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { AutomatedPaymentsToggle } from "./automated-payments-toggle";
import { PayByProperty } from "./pay-by-property";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const STATUS_SECTIONS: { label: string; statuses: string[] }[] = [
  { label: "Overdue", statuses: ["overdue"] },
  { label: "Open", statuses: ["sent"] },
  { label: "Partial", statuses: ["partial"] },
  { label: "Disputed", statuses: ["disputed"] },
  { label: "Draft", statuses: ["draft"] },
  { label: "Paid", statuses: ["paid"] },
  { label: "Void", statuses: ["void"] },
];

/** Display YYYY-MM-DD without UTC shift (e.g. August 5, 2026). */
function formatDisplayDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!month || month < 1 || month > 12) return String(iso);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Move trailing YYYY-MM before the descriptor for display only.
 * "HL-16 base rent 2026-08" → "August HL-16 base rent"
 */
function formatInvoiceLineDescription(description: string) {
  const match = description.match(/^(.*)\s+(\d{4})-(\d{2})\s*$/);
  if (!match) return description;
  const descriptor = match[1].trim();
  const month = Number(match[3]);
  if (!descriptor || !month || month < 1 || month > 12) return description;
  return `${MONTH_NAMES[month - 1]} ${descriptor}`;
}

type InvoiceLine = {
  line_type: string;
  description: string;
  amount: number;
};

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
  invoice_lines: InvoiceLine[] | null;
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

function InvoiceSummaryCard({ inv }: { inv: InvoiceRow }) {
  const lines = inv.invoice_lines ?? [];
  return (
    <div className="rounded border border-slate-200 bg-white/90 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-[#0c1f2e]">{inv.invoice_number}</p>
        <Badge status={inv.status} />
      </div>
      <div className="text-sm text-slate-600">
        <p>Issue Date: {formatDisplayDate(inv.issue_date)}</p>
        <p>Due Date: {formatDisplayDate(inv.due_date)}</p>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-slate-600">
        {lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{formatInvoiceLineDescription(l.description)}</span>
            <span className="shrink-0">{formatMoney(l.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-medium text-slate-800">
        Total {formatMoney(inv.total)}
      </p>
      {inv.status === "disputed" && inv.dispute_reason ? (
        <p className="mt-2 text-sm text-rose-700">
          Dispute: {inv.dispute_reason}
        </p>
      ) : null}
    </div>
  );
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
            Payments
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

  const propertyGroups = [...byProperty.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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
          Payments
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

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
          Invoices by property
        </h2>
        {propertyGroups.length === 0 ? (
          <Card title="No invoices">
            <p className="text-sm text-slate-600">
              You do not have any invoices yet.
            </p>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {propertyGroups.map((group) => (
              <div
                key={group.id}
                className="min-w-[300px] max-w-xl flex-1 shrink-0 basis-[calc(50%-0.5rem)]"
              >
                <Card title={group.name}>
                  <div className="space-y-5">
                    {STATUS_SECTIONS.map((section) => {
                      const sectionInvoices = group.invoices.filter((inv) =>
                        section.statuses.includes(inv.status)
                      );
                      if (sectionInvoices.length === 0) return null;
                      return (
                        <div key={section.label}>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {section.label}
                          </h3>
                          <div className="space-y-3">
                            {sectionInvoices.map((inv) => (
                              <InvoiceSummaryCard key={inv.id} inv={inv} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {group.invoices.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No invoices for this property.
                      </p>
                    ) : null}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
