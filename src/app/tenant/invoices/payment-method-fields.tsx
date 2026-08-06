"use client";

import { useMemo, useState } from "react";
import {
  DEMO_PROCESSOR_METHODS,
  type TenantPayMethod,
} from "@/lib/payments/types";

export type { TenantPayMethod };

export const paymentInputClass =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm";

export function PaymentMethodPicker({
  method,
  onChange,
  idPrefix = "pay",
}: {
  method: TenantPayMethod;
  onChange: (method: TenantPayMethod) => void;
  idPrefix?: string;
}) {
  const btn = (value: TenantPayMethod, label: string) => {
    const active = method === value;
    return (
      <button
        key={value}
        type="button"
        id={`${idPrefix}-${value}`}
        onClick={() => onChange(value)}
        aria-pressed={active}
        className={`rounded border px-3 py-2 text-left text-sm transition ${
          active
            ? "border-[#0c1f2e] bg-[#0c1f2e] text-white"
            : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <p className="font-medium text-slate-800">Payment method</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {btn("ach", "Bank account (ACH)")}
        {btn("credit_card", "Credit card")}
        {btn("debit_card", "Debit card")}
      </div>
    </div>
  );
}

/**
 * SAQ A–shaped panel: Harborline never renders PAN, CVV, or full account fields.
 * Sensitive details stay in the processor frame (Stripe Elements when configured,
 * or a locked simulated processor panel in classroom demo mode).
 */
export function SecureProcessorPanel({
  method,
  amountLabel,
  authorized,
  onAuthorizedChange,
  demoReady,
  onDemoReadyChange,
  stripeMode,
}: {
  method: TenantPayMethod;
  amountLabel: string;
  authorized: boolean;
  onAuthorizedChange: (value: boolean) => void;
  demoReady: boolean;
  onDemoReadyChange: (value: boolean) => void;
  stripeMode: boolean;
}) {
  const demo = DEMO_PROCESSOR_METHODS[method];
  const methodLabel =
    method === "ach"
      ? "bank account"
      : method === "debit_card"
        ? "debit card"
        : "credit card";

  return (
    <div className="space-y-3 rounded border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#0c1f2e] text-[9px] font-semibold tracking-tight text-white"
          aria-hidden
        >
          PCI
        </span>
        <div>
          <p className="font-medium text-slate-800">Secure payment details</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {stripeMode
              ? "Card and bank fields are collected by Stripe’s PCI-compliant Payment Element. Harborline never receives full card or bank account numbers."
              : "Classroom demo: sensitive payment fields are collected only inside a processor-controlled frame. Harborline stores a payment-method token, brand, and last4 — never PAN, CVV, or full account numbers. No live charge is made."}
          </p>
        </div>
      </div>

      {stripeMode ? (
        <div
          id="stripe-payment-element-slot"
          className="min-h-[140px] rounded border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500"
        >
          Stripe Payment Element loads here when you continue to confirmation.
        </div>
      ) : (
        <div className="space-y-3 rounded border border-dashed border-slate-300 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Processor frame (simulated)
          </p>
          <p className="text-sm text-slate-700">
            Attach a Stripe test {methodLabel} without typing card or bank
            numbers into Harborline.
          </p>
          <button
            type="button"
            onClick={() => onDemoReadyChange(true)}
            className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
              demoReady
                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
            }`}
          >
            {demoReady
              ? `Attached: ${demo.label}`
              : `Attach test method — ${demo.label}`}
          </button>
          <p className="text-[11px] text-slate-500">
            Uses public Stripe test identifiers (token + last4 only). Do not enter
            real card or bank account numbers anywhere in this app.
          </p>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(e) => onAuthorizedChange(e.target.checked)}
          className="mt-0.5 accent-[#0c1f2e]"
          required
        />
        <span>
          I authorize Harborline to process this payment of{" "}
          <strong>{amountLabel}</strong> through the secure payment processor
          for the selected method.
        </span>
      </label>
    </div>
  );
}

export function buildSimulatedProcessorResult(method: TenantPayMethod) {
  const demo = DEMO_PROCESSOR_METHODS[method];
  const stamp = Date.now();
  return {
    processor: "stripe_test_sim" as const,
    processorPaymentId: `pi_sim_${stamp}`,
    processorPaymentMethodId: `pm_sim_${method}_${stamp}`,
    method,
    brand: demo.brand,
    last4: demo.last4,
  };
}

/** Hidden fields that carry only tokenized processor metadata — never CHD. */
export function ProcessorResultFields({
  result,
}: {
  result: {
    processor: string;
    processorPaymentId: string;
    processorPaymentMethodId: string;
    method: TenantPayMethod;
    brand: string;
    last4: string;
  } | null;
}) {
  const values = useMemo(() => result, [result]);
  if (!values) return null;
  return (
    <>
      <input type="hidden" name="processor" value={values.processor} />
      <input
        type="hidden"
        name="processor_payment_id"
        value={values.processorPaymentId}
      />
      <input
        type="hidden"
        name="processor_payment_method_id"
        value={values.processorPaymentMethodId}
      />
      <input type="hidden" name="payment_method" value={values.method} />
      <input type="hidden" name="card_brand" value={values.brand} />
      <input type="hidden" name="card_last4" value={values.last4} />
    </>
  );
}

export function useSecurePayState(initialMethod: TenantPayMethod = "ach") {
  const [method, setMethod] = useState<TenantPayMethod>(initialMethod);
  const [authorized, setAuthorized] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  const reset = () => {
    setMethod(initialMethod);
    setAuthorized(false);
    setDemoReady(false);
  };

  const onMethodChange = (next: TenantPayMethod) => {
    setMethod(next);
    setDemoReady(false);
    setAuthorized(false);
  };

  return {
    method,
    setMethod: onMethodChange,
    authorized,
    setAuthorized,
    demoReady,
    setDemoReady,
    reset,
  };
}
