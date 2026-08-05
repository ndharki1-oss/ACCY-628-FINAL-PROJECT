"use client";

import { useState } from "react";

export const paymentInputClass =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm";

export type PaymentMethod = "ach" | "credit_card" | "debit_card";

export function PaymentMethodPicker({
  method,
  onChange,
  idPrefix = "pay",
}: {
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  idPrefix?: string;
}) {
  const btn = (value: PaymentMethod, label: string) => {
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

export function AchPaymentFields({ idPrefix = "ach" }: { idPrefix?: string }) {
  return (
    <div className="space-y-3 rounded border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs text-slate-500">
        Simulated only — bank details are not stored or charged.
      </p>
      <div>
        <label
          htmlFor={`${idPrefix}-bank-name`}
          className="mb-1 block font-medium"
        >
          Bank name
        </label>
        <input
          id={`${idPrefix}-bank-name`}
          type="text"
          autoComplete="organization"
          placeholder="Bank name"
          className={paymentInputClass}
        />
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-account-name`}
          className="mb-1 block font-medium"
        >
          Bank account name
        </label>
        <input
          id={`${idPrefix}-account-name`}
          type="text"
          autoComplete="name"
          placeholder="Name on the account"
          className={paymentInputClass}
        />
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-account-number`}
          className="mb-1 block font-medium"
        >
          Bank account number
        </label>
        <input
          id={`${idPrefix}-account-number`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Account number"
          className={paymentInputClass}
        />
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-routing-number`}
          className="mb-1 block font-medium"
        >
          Routing number
        </label>
        <input
          id={`${idPrefix}-routing-number`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="9-digit routing number"
          className={paymentInputClass}
        />
      </div>
    </div>
  );
}

export function CardPaymentFields({
  kind,
  businessAddress,
  idPrefix,
}: {
  kind: "credit" | "debit";
  businessAddress: string;
  idPrefix?: string;
}) {
  const [sameAsBusiness, setSameAsBusiness] = useState(true);
  const label = kind === "debit" ? "Debit" : "Credit";
  const prefix = idPrefix ?? kind;

  return (
    <div className="space-y-3 rounded border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs text-slate-500">
        Simulated only — {kind} card details are not stored or charged.
      </p>
      <div>
        <label
          htmlFor={`${prefix}-card-type`}
          className="mb-1 block font-medium"
        >
          Card type
        </label>
        <select
          id={`${prefix}-card-type`}
          defaultValue=""
          className={paymentInputClass}
        >
          <option value="" disabled>
            Select card type
          </option>
          <option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option>
          <option value="american_express">American Express</option>
          <option value="discover">Discover</option>
          <option value="wells_fargo">Wells Fargo</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label
          htmlFor={`${prefix}-card-number`}
          className="mb-1 block font-medium"
        >
          {label} card number
        </label>
        <input
          id={`${prefix}-card-number`}
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="ACCT-000035"
          className={paymentInputClass}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${prefix}-card-exp`}
            className="mb-1 block font-medium"
          >
            Exp. date
          </label>
          <input
            id={`${prefix}-card-exp`}
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            className={paymentInputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${prefix}-card-cvv`}
            className="mb-1 block font-medium"
          >
            CVV code
          </label>
          <input
            id={`${prefix}-card-cvv`}
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            className={paymentInputClass}
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <p className="font-medium text-slate-800">Billing address</p>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={sameAsBusiness}
            onChange={(e) => setSameAsBusiness(e.target.checked)}
            className="mt-0.5 accent-[#0c1f2e]"
          />
          <span>
            Same as business address
            {businessAddress ? (
              <span className="mt-0.5 block text-xs text-slate-500">
                {businessAddress}
              </span>
            ) : null}
          </span>
        </label>

        {!sameAsBusiness ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor={`${prefix}-bill-street`}
                className="mb-1 block font-medium"
              >
                Street address
              </label>
              <input
                id={`${prefix}-bill-street`}
                type="text"
                autoComplete="billing street-address"
                placeholder="Street address"
                className={paymentInputClass}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor={`${prefix}-bill-city`}
                  className="mb-1 block font-medium"
                >
                  City
                </label>
                <input
                  id={`${prefix}-bill-city`}
                  type="text"
                  autoComplete="billing address-level2"
                  placeholder="City"
                  className={paymentInputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${prefix}-bill-state`}
                  className="mb-1 block font-medium"
                >
                  State
                </label>
                <input
                  id={`${prefix}-bill-state`}
                  type="text"
                  autoComplete="billing address-level1"
                  placeholder="ST"
                  className={paymentInputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${prefix}-bill-zip`}
                  className="mb-1 block font-medium"
                >
                  ZIP
                </label>
                <input
                  id={`${prefix}-bill-zip`}
                  type="text"
                  autoComplete="billing postal-code"
                  placeholder="ZIP"
                  className={paymentInputClass}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentMethodDetails({
  method,
  businessAddress,
  idPrefix,
}: {
  method: PaymentMethod;
  businessAddress: string;
  idPrefix: string;
}) {
  if (method === "ach") {
    return <AchPaymentFields idPrefix={`${idPrefix}-ach`} />;
  }
  if (method === "credit_card") {
    return (
      <CardPaymentFields
        kind="credit"
        businessAddress={businessAddress}
        idPrefix={`${idPrefix}-credit`}
      />
    );
  }
  return (
    <CardPaymentFields
      kind="debit"
      businessAddress={businessAddress}
      idPrefix={`${idPrefix}-debit`}
    />
  );
}
