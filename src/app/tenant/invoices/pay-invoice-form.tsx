"use client";

import { useState } from "react";
import { tenantPayInvoice } from "@/app/actions/business";
import {
  PaymentMethod,
  PaymentMethodDetails,
  PaymentMethodPicker,
} from "./payment-method-fields";

type Flow = "closed" | "pay" | "custom";

export function PayInvoiceForm({
  invoiceId,
  amount,
  amountLabel,
  autoPayEnabled,
  businessAddress,
}: {
  invoiceId: string;
  amount: number;
  amountLabel: string;
  autoPayEnabled: boolean;
  businessAddress: string;
}) {
  const [flow, setFlow] = useState<Flow>("closed");
  const [method, setMethod] = useState<PaymentMethod>("ach");
  const [customAmount, setCustomAmount] = useState("");

  const close = () => {
    setFlow("closed");
    setCustomAmount("");
    setMethod("ach");
  };

  if (flow === "closed") {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFlow("pay")}
          className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white"
        >
          Pay {amountLabel}
        </button>
        {!autoPayEnabled ? (
          <button
            type="button"
            onClick={() => setFlow("custom")}
            className="rounded border border-[#c4784a] px-4 py-2 text-sm text-[#c4784a] hover:bg-[#c4784a]/10"
          >
            Custom Amount
          </button>
        ) : null}
      </div>
    );
  }

  // Full balance pay + automated payments on: confirm or cancel
  if (flow === "pay" && autoPayEnabled) {
    return (
      <form action={tenantPayInvoice} className="mt-4 space-y-3 text-sm">
        <input type="hidden" name="invoice_id" value={invoiceId} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="auto_pay" value="true" />
        <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          Automated payments are on. Confirm to pay{" "}
          <strong>{amountLabel}</strong> now, or cancel.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white"
          >
            Confirm payment
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const isCustom = flow === "custom";
  const parsedCustom = Number(customAmount);
  const payAmount = isCustom ? parsedCustom : amount;
  const amountValid =
    !isCustom || (Number.isFinite(parsedCustom) && parsedCustom > 0);

  return (
    <form action={tenantPayInvoice} className="mt-4 space-y-4 text-sm">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="hidden" name="amount" value={amountValid ? payAmount : ""} />
      <input
        type="hidden"
        name="auto_pay"
        value={autoPayEnabled ? "true" : "false"}
      />
      <input type="hidden" name="payment_method" value={method} />

      {isCustom ? (
        <div>
          <label
            htmlFor={`custom-amount-${invoiceId}`}
            className="mb-1 block font-medium text-slate-800"
          >
            Custom amount
          </label>
          <input
            id={`custom-amount-${invoiceId}`}
            type="number"
            min="0.01"
            step="0.01"
            max={amount}
            required
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={`Up to ${amountLabel}`}
            className="w-full max-w-xs rounded border border-slate-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Balance due: {amountLabel}
          </p>
        </div>
      ) : null}

      <PaymentMethodPicker
        method={method}
        onChange={setMethod}
        idPrefix={`${flow}-${invoiceId}`}
      />

      <PaymentMethodDetails
        method={method}
        businessAddress={businessAddress}
        idPrefix={`${flow}-${invoiceId}`}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!amountValid}
          className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm payment
        </button>
        <button
          type="button"
          onClick={close}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
