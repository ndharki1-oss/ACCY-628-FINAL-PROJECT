"use client";

import { useState } from "react";
import { toggleAutoPay } from "@/app/actions/business";

const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm";

function CardPaymentFields({
  kind,
  businessAddress,
}: {
  kind: "credit" | "debit";
  businessAddress: string;
}) {
  const [sameAsBusiness, setSameAsBusiness] = useState(true);
  const label = kind === "debit" ? "Debit" : "Credit";

  return (
    <div className="space-y-3 rounded border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs text-slate-500">
        Simulated only — {kind} card details are not stored or charged.
      </p>
      <div>
        <label htmlFor={`${kind}-card-type`} className="mb-1 block font-medium">
          Card type
        </label>
        <select
          id={`${kind}-card-type`}
          defaultValue=""
          className={inputClass}
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
        <label htmlFor={`${kind}-card-number`} className="mb-1 block font-medium">
          {label} card number
        </label>
        <input
          id={`${kind}-card-number`}
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="ACCT-000035"
          className={inputClass}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${kind}-card-exp`} className="mb-1 block font-medium">
            Exp. date
          </label>
          <input
            id={`${kind}-card-exp`}
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${kind}-card-cvv`} className="mb-1 block font-medium">
            CVV code
          </label>
          <input
            id={`${kind}-card-cvv`}
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            className={inputClass}
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
                htmlFor={`${kind}-bill-street`}
                className="mb-1 block font-medium"
              >
                Street address
              </label>
              <input
                id={`${kind}-bill-street`}
                type="text"
                autoComplete="billing street-address"
                placeholder="Street address"
                className={inputClass}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor={`${kind}-bill-city`}
                  className="mb-1 block font-medium"
                >
                  City
                </label>
                <input
                  id={`${kind}-bill-city`}
                  type="text"
                  autoComplete="billing address-level2"
                  placeholder="City"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${kind}-bill-state`}
                  className="mb-1 block font-medium"
                >
                  State
                </label>
                <input
                  id={`${kind}-bill-state`}
                  type="text"
                  autoComplete="billing address-level1"
                  placeholder="ST"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${kind}-bill-zip`}
                  className="mb-1 block font-medium"
                >
                  ZIP
                </label>
                <input
                  id={`${kind}-bill-zip`}
                  type="text"
                  autoComplete="billing postal-code"
                  placeholder="ZIP"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TenantAutoPayForm({
  enabled,
  businessAddress,
}: {
  enabled: boolean;
  businessAddress: string;
}) {
  const [method, setMethod] = useState<"ach" | "credit_card" | "debit_card">(
    "ach"
  );

  const methodBtn = (value: typeof method, label: string) => {
    const active = method === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setMethod(value)}
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
    <form action={toggleAutoPay} className="space-y-4 text-sm">
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <input type="hidden" name="payment_method" value={method} />

      <div className="space-y-2">
        <p className="font-medium text-slate-800">Payment method</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {methodBtn("ach", "Bank account (ACH)")}
          {methodBtn("credit_card", "Credit card")}
          {methodBtn("debit_card", "Debit card")}
        </div>
      </div>

      {method === "ach" ? (
        <div className="space-y-3 rounded border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs text-slate-500">
            Simulated only — bank details are not stored or charged.
          </p>
          <div>
            <label htmlFor="ach-bank-name" className="mb-1 block font-medium">
              Bank name
            </label>
            <input
              id="ach-bank-name"
              type="text"
              autoComplete="organization"
              placeholder="Bank name"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="ach-account-name"
              className="mb-1 block font-medium"
            >
              Bank account name
            </label>
            <input
              id="ach-account-name"
              type="text"
              autoComplete="name"
              placeholder="Name on the account"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="ach-account-number"
              className="mb-1 block font-medium"
            >
              Bank account number
            </label>
            <input
              id="ach-account-number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Account number"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="ach-routing-number"
              className="mb-1 block font-medium"
            >
              Routing number
            </label>
            <input
              id="ach-routing-number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="9-digit routing number"
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {method === "credit_card" ? (
        <CardPaymentFields kind="credit" businessAddress={businessAddress} />
      ) : null}

      {method === "debit_card" ? (
        <CardPaymentFields kind="debit" businessAddress={businessAddress} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span>
          Currently: <strong>{enabled ? "Enabled" : "Disabled"}</strong>
        </span>
        <button
          type="submit"
          className="rounded bg-[#0c1f2e] px-3 py-1.5 text-white"
        >
          {enabled ? "Disable" : "Enable"} auto-pay
        </button>
      </div>
    </form>
  );
}
