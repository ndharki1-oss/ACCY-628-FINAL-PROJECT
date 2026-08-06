"use client";

import { FormEvent, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  createTenantPaymentIntent,
  tenantPayInvoice,
} from "@/app/actions/business";
import {
  PaymentMethodPicker,
  ProcessorResultFields,
  SecureProcessorPanel,
  buildSimulatedProcessorResult,
  useSecurePayState,
  type TenantPayMethod,
} from "./payment-method-fields";

type Flow = "closed" | "pay" | "custom";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function StripeConfirmForm({
  invoiceId,
  amount,
  amountLabel,
  autoPayEnabled,
  method,
  onCancel,
}: {
  invoiceId: string;
  amount: number;
  amountLabel: string;
  autoPayEnabled: boolean;
  method: TenantPayMethod;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !authorized) return;
    setBusy(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Payment details incomplete.");
      setBusy(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment could not be confirmed.");
      setBusy(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setError("Payment was not completed. Try again or contact Harborline.");
      setBusy(false);
      return;
    }

    const pm = paymentIntent.payment_method;
    const pmId = typeof pm === "string" ? pm : pm?.id ?? paymentIntent.id;
    let brand = method === "ach" ? "us_bank_account" : "card";
    let last4 = "";
    if (typeof pm !== "string" && pm) {
      if ("card" in pm && pm.card) {
        brand = pm.card.brand ?? "card";
        last4 = pm.card.last4 ?? "";
      } else if ("us_bank_account" in pm && pm.us_bank_account) {
        brand = "us_bank_account";
        last4 = pm.us_bank_account.last4 ?? "";
      }
    }

    const fd = new FormData();
    fd.set("invoice_id", invoiceId);
    fd.set("amount", String(amount));
    fd.set("auto_pay", autoPayEnabled ? "true" : "false");
    fd.set("processor", "stripe");
    fd.set("processor_payment_id", paymentIntent.id);
    fd.set("processor_payment_method_id", pmId);
    fd.set("payment_method", method);
    fd.set("card_brand", brand);
    fd.set("card_last4", last4);
    await tenantPayInvoice(fd);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded border border-slate-200 bg-white p-3">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(e) => setAuthorized(e.target.checked)}
          className="mt-0.5 accent-[#0c1f2e]"
          required
        />
        <span>
          I authorize Harborline to charge{" "}
          <strong>{amountLabel}</strong> via Stripe for this invoice.
        </span>
      </label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!stripe || !elements || !authorized || busy}
          className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Processing…" : "Confirm payment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SimulatedPayFields({
  invoiceId,
  amount,
  amountLabel,
  autoPayEnabled,
  isCustom,
  customAmount,
  setCustomAmount,
  onCancel,
}: {
  invoiceId: string;
  amount: number;
  amountLabel: string;
  autoPayEnabled: boolean;
  isCustom: boolean;
  customAmount: string;
  setCustomAmount: (v: string) => void;
  onCancel: () => void;
}) {
  const {
    method,
    setMethod,
    authorized,
    setAuthorized,
    demoReady,
    setDemoReady,
  } = useSecurePayState("ach");

  const parsedCustom = Number(customAmount);
  const payAmount = isCustom ? parsedCustom : amount;
  const amountValid =
    !isCustom || (Number.isFinite(parsedCustom) && parsedCustom > 0);
  const canSubmit = amountValid && authorized && demoReady;
  const result = demoReady ? buildSimulatedProcessorResult(method) : null;

  return (
    <form action={tenantPayInvoice} className="space-y-4 text-sm">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="hidden" name="amount" value={amountValid ? payAmount : ""} />
      <input
        type="hidden"
        name="auto_pay"
        value={autoPayEnabled ? "true" : "false"}
      />
      <ProcessorResultFields result={result} />

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
        idPrefix={`${isCustom ? "custom" : "pay"}-${invoiceId}`}
      />

      <SecureProcessorPanel
        method={method}
        amountLabel={
          amountValid && isCustom
            ? `$${payAmount.toFixed(2)}`
            : amountLabel
        }
        authorized={authorized}
        onAuthorizedChange={setAuthorized}
        demoReady={demoReady}
        onDemoReadyChange={setDemoReady}
        stripeMode={false}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm payment
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PayInvoiceForm({
  invoiceId,
  amount,
  amountLabel,
  autoPayEnabled,
  stripeConfigured,
  stripePublishableKey,
}: {
  invoiceId: string;
  amount: number;
  amountLabel: string;
  autoPayEnabled: boolean;
  stripeConfigured: boolean;
  stripePublishableKey: string;
}) {
  const [flow, setFlow] = useState<Flow>("closed");
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<TenantPayMethod>("ach");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const close = () => {
    setFlow("closed");
    setCustomAmount("");
    setMethod("ach");
    setClientSecret(null);
    setStripeError(null);
    setPreparing(false);
  };

  async function startStripeCheckout(payAmount: number) {
    setPreparing(true);
    setStripeError(null);
    try {
      const intent = await createTenantPaymentIntent({
        invoiceId,
        amount: payAmount,
        method,
      });
      if (intent.mode !== "stripe" || !intent.clientSecret) {
        const message =
          intent.mode === "stripe" && "error" in intent && intent.error
            ? intent.error
            : "Stripe is not available. Use the simulated processor instead.";
        setStripeError(message);
        setPreparing(false);
        return;
      }
      setClientSecret(intent.clientSecret);
    } catch (err) {
      setStripeError(
        err instanceof Error ? err.message : "Could not start Stripe checkout."
      );
    } finally {
      setPreparing(false);
    }
  }

  if (flow === "closed") {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFlow("pay")}
          className="harborline-live-tile rounded bg-[#c4784a] px-4 py-2 text-sm text-white"
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

  // Full balance + autopay on: quick confirm (uses saved processor method pattern).
  if (flow === "pay" && autoPayEnabled && !stripeConfigured) {
    const result = buildSimulatedProcessorResult("ach");
    return (
      <form action={tenantPayInvoice} className="mt-4 space-y-3 text-sm">
        <input type="hidden" name="invoice_id" value={invoiceId} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="auto_pay" value="true" />
        <ProcessorResultFields result={result} />
        <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          Automated payments are on. Confirm to pay{" "}
          <strong>{amountLabel}</strong> with your saved processor method
          (tokenized — Harborline does not store full account numbers).
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

  if (stripeConfigured) {
    return (
      <div className="mt-4 space-y-4 text-sm">
        {isCustom ? (
          <div>
            <label
              htmlFor={`custom-amount-stripe-${invoiceId}`}
              className="mb-1 block font-medium text-slate-800"
            >
              Custom amount
            </label>
            <input
              id={`custom-amount-stripe-${invoiceId}`}
              type="number"
              min="0.01"
              step="0.01"
              max={amount}
              required
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setClientSecret(null);
              }}
              placeholder={`Up to ${amountLabel}`}
              className="w-full max-w-xs rounded border border-slate-300 px-3 py-2"
            />
          </div>
        ) : null}

        <PaymentMethodPicker
          method={method}
          onChange={(m) => {
            setMethod(m);
            setClientSecret(null);
          }}
          idPrefix={`stripe-${flow}-${invoiceId}`}
        />

        <p className="text-xs text-slate-500">
          Card and bank details are collected by Stripe (PCI SAQ A pattern).
          Harborline only receives a payment token, brand, and last4.
        </p>

        {!clientSecret ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!amountValid || preparing}
              onClick={() => startStripeCheckout(payAmount)}
              className="rounded bg-[#c4784a] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {preparing ? "Starting secure checkout…" : "Continue to Stripe"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Elements
            stripe={getStripePromise(stripePublishableKey)}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <StripeConfirmForm
              invoiceId={invoiceId}
              amount={payAmount}
              amountLabel={
                isCustom ? `$${payAmount.toFixed(2)}` : amountLabel
              }
              autoPayEnabled={autoPayEnabled}
              method={method}
              onCancel={close}
            />
          </Elements>
        )}
        {stripeError ? (
          <p className="text-sm text-rose-700">{stripeError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <SimulatedPayFields
        invoiceId={invoiceId}
        amount={amount}
        amountLabel={amountLabel}
        autoPayEnabled={autoPayEnabled}
        isCustom={isCustom}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
        onCancel={close}
      />
    </div>
  );
}
