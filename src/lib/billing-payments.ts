export type BillingPaymentDetail = {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  appliedAmount: number;
  method: string;
  isAutoPay: boolean;
  reference: string | null;
  timing: "early" | "on_time" | "late";
};

export type BillingInvoiceRow = {
  id: string;
  invoiceNumber: string;
  partyName: string;
  partyType: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  status: string;
  payments: BillingPaymentDetail[];
};

export function paymentTiming(
  dueDate: string,
  paymentDate: string
): BillingPaymentDetail["timing"] {
  if (paymentDate < dueDate) return "early";
  if (paymentDate > dueDate) return "late";
  return "on_time";
}

export function timingLabel(timing: BillingPaymentDetail["timing"] | "unpaid") {
  switch (timing) {
    case "early":
      return "Early";
    case "on_time":
      return "On time";
    case "late":
      return "Late";
    default:
      return "Unpaid";
  }
}

export function timingClass(timing: BillingPaymentDetail["timing"] | "unpaid") {
  switch (timing) {
    case "early":
      return "bg-emerald-100 text-emerald-800";
    case "on_time":
      return "bg-sky-100 text-sky-800";
    case "late":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function methodLabel(method: string) {
  const map: Record<string, string> = {
    ach: "ACH / bank transfer",
    simulated_ach: "ACH (simulated)",
    credit_card: "Credit card",
    debit_card: "Debit card",
    card: "Card",
    check: "Check",
    wire: "Wire",
    cash: "Cash",
  };
  return map[method] ?? method.replaceAll("_", " ");
}

export function buildPaymentDetails(
  dueDate: string,
  payments: Omit<BillingPaymentDetail, "timing">[]
): BillingPaymentDetail[] {
  return payments.map((payment) => ({
    ...payment,
    timing: paymentTiming(dueDate, payment.paymentDate),
  }));
}
