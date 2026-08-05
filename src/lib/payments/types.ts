export type TenantPayMethod = "ach" | "credit_card" | "debit_card";

export type ProcessorPaymentResult = {
  processor: "stripe" | "stripe_test_sim";
  processorPaymentId: string;
  processorPaymentMethodId: string;
  method: TenantPayMethod;
  brand: string;
  last4: string;
};

export function methodToDbValue(method: TenantPayMethod): string {
  if (method === "credit_card") return "credit_card";
  if (method === "debit_card") return "debit_card";
  return "ach";
}

/** Public Stripe test last4 values — never full PAN. */
export const DEMO_PROCESSOR_METHODS = {
  ach: {
    brand: "us_bank_account",
    last4: "6789",
    label: "Bank account ······6789",
  },
  credit_card: {
    brand: "visa",
    last4: "4242",
    label: "Visa ····4242",
  },
  debit_card: {
    brand: "mastercard",
    last4: "4444",
    label: "Mastercard ····4444",
  },
} as const;
