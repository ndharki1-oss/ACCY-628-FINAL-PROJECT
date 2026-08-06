"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { PayInvoiceForm } from "./pay-invoice-form";

export type PayByPropertyOption = {
  id: string;
  name: string;
};

export type PayableInvoiceOption = {
  id: string;
  invoiceNumber: string;
  due: number;
  dueLabel: string;
  propertyId: string;
};

export function PayByProperty({
  properties,
  invoices,
  autoPayEnabled,
  stripeConfigured,
  stripePublishableKey,
}: {
  properties: PayByPropertyOption[];
  invoices: PayableInvoiceOption[];
  autoPayEnabled: boolean;
  stripeConfigured: boolean;
  stripePublishableKey: string;
}) {
  const [propertyId, setPropertyId] = useState("");

  const selectedInvoices = useMemo(
    () =>
      propertyId
        ? invoices.filter((inv) => inv.propertyId === propertyId)
        : [],
    [invoices, propertyId]
  );

  if (properties.length === 0) {
    return (
      <Card title="Pay Invoices">
        <p className="text-sm text-slate-600">
          There are no open invoices for the selected property at this time.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Pay Invoices">
      <div className="space-y-4">
        <div>
          <select
            id="pay-property"
            aria-label="Select a property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {!propertyId ? (
          <p className="text-sm text-slate-600">
            Choose a property to view open invoices.
          </p>
        ) : selectedInvoices.length === 0 ? (
          <p className="text-sm text-slate-600">
            There are no open invoices for the selected property at this time.
          </p>
        ) : (
          <ul className="space-y-4">
            {selectedInvoices.map((inv) => (
              <li
                key={inv.id}
                className="rounded border border-slate-200 bg-slate-50/80 p-3"
              >
                <p className="text-sm font-medium text-[#0c1f2e]">
                  {inv.invoiceNumber}
                </p>
                <p className="text-xs text-slate-600">
                  Balance due {inv.dueLabel}
                </p>
                <PayInvoiceForm
                  invoiceId={inv.id}
                  amount={inv.due}
                  amountLabel={inv.dueLabel}
                  autoPayEnabled={autoPayEnabled}
                  stripeConfigured={stripeConfigured}
                  stripePublishableKey={stripePublishableKey}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
