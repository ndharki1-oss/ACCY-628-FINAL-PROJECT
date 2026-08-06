"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { formatInvoiceDisplayDate } from "@/lib/invoice-documents/types";
import { InvoiceDocumentButton } from "./invoice-document-button";

const STATUS_SECTIONS: { label: string; statuses: string[] }[] = [
  { label: "Overdue", statuses: ["overdue"] },
  { label: "Open", statuses: ["sent"] },
  { label: "Partial", statuses: ["partial"] },
  { label: "Disputed", statuses: ["disputed"] },
  { label: "Draft", statuses: ["draft"] },
  { label: "Paid", statuses: ["paid"] },
  { label: "Void", statuses: ["void"] },
];

export type PropertyInvoiceGroup = {
  id: string;
  name: string;
  invoices: {
    id: string;
    invoice_number: string;
    status: string;
    due_date: string;
    total: number | string;
    amount_paid: number | string;
  }[];
};

function paidLabel(inv: PropertyInvoiceGroup["invoices"][number]) {
  const total = Number(inv.total);
  const paid = Number(inv.amount_paid);
  if (inv.status === "paid" || (total > 0 && paid >= total)) return "Paid";
  if (paid > 0) return "Partially paid";
  return "Unpaid";
}

function InvoiceSummaryCard({
  inv,
}: {
  inv: PropertyInvoiceGroup["invoices"][number];
}) {
  return (
    <div className="rounded border border-slate-200 bg-white/90 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-[#0c1f2e]">{inv.invoice_number}</p>
        <Badge status={inv.status} />
      </div>
      <div className="space-y-1 text-sm text-slate-600">
        <p>Due Date: {formatInvoiceDisplayDate(inv.due_date)}</p>
        <p>Total: {formatMoney(inv.total)}</p>
        <p>Paid: {paidLabel(inv)}</p>
      </div>
      <div className="mt-3">
        <InvoiceDocumentButton
          invoiceId={inv.id}
          invoiceNumber={inv.invoice_number}
        />
      </div>
    </div>
  );
}

export function InvoicesByProperty({
  propertyGroups,
}: {
  propertyGroups: PropertyInvoiceGroup[];
}) {
  const [propertyId, setPropertyId] = useState("");

  const selectedGroup = useMemo(
    () => propertyGroups.find((g) => g.id === propertyId) ?? null,
    [propertyGroups, propertyId]
  );

  if (propertyGroups.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
          Invoices by property
        </h2>
        <Card title="No invoices">
          <p className="text-sm text-slate-600">
            You do not have any invoices yet.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
        Invoices by property
      </h2>
      <Card title="Property invoices">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="invoices-by-property"
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Property
            </label>
            <select
              id="invoices-by-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select a property</option>
              {propertyGroups.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {!selectedGroup ? (
            <p className="text-sm text-slate-600">
              Choose a property to view its invoices.
            </p>
          ) : selectedGroup.invoices.length === 0 ? (
            <p className="text-sm text-slate-600">
              No invoices for this property.
            </p>
          ) : (
            <div className="space-y-5">
              {STATUS_SECTIONS.map((section) => {
                const sectionInvoices = selectedGroup.invoices.filter((inv) =>
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
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
