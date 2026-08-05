export type LeaseHealth = "healthy" | "attention_needed" | "high_priority";

export type LeaseDisplayStatus =
  | "active"
  | "renewal_soon"
  | "renewal_pending"
  | "expired"
  | "terminated"
  | "canceled"
  | "draft";

export type RenewalStatusLabel =
  | "renewal_pending"
  | "renewal_soon"
  | "renewal_amendment_on_file"
  | "not_started";

export type PaymentStatusLabel =
  | "current"
  | "partial"
  | "overdue"
  | "none_billed";

export type InvoiceBalanceInput = {
  status: string;
  total: number | string;
  amount_paid: number | string;
};

function startOfToday(from = new Date()) {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate());
}

function parseDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

export function isLiveLeaseStatus(status: string | null | undefined) {
  return status === "active" || status === "renewal_pending";
}

export function daysUntil(dateStr: string, from = new Date()) {
  const end = parseDateOnly(dateStr);
  if (!Number.isFinite(end.getTime())) return Number.POSITIVE_INFINITY;
  const start = startOfToday(from);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function expiresWithinDays(
  endDate: string,
  days: number,
  from = new Date()
) {
  const remaining = daysUntil(endDate, from);
  return remaining >= 0 && remaining <= days;
}

export function monthlyTotal(
  rent: number | string | null | undefined,
  cam: number | string | null | undefined
) {
  return Number(rent ?? 0) + Number(cam ?? 0);
}

export function invoiceOpenBalance(invoice: InvoiceBalanceInput) {
  if (invoice.status === "void") return 0;
  return Math.max(Number(invoice.total) - Number(invoice.amount_paid), 0);
}

export function leaseOpenBalance(invoices: InvoiceBalanceInput[]) {
  return invoices.reduce((sum, invoice) => sum + invoiceOpenBalance(invoice), 0);
}

export function leaseDisplayStatus(
  status: string,
  endDate: string
): LeaseDisplayStatus {
  if (status === "active" && expiresWithinDays(endDate, 90)) return "renewal_soon";
  if (
    status === "renewal_pending" ||
    status === "expired" ||
    status === "terminated" ||
    status === "canceled" ||
    status === "draft" ||
    status === "active"
  ) {
    return status;
  }
  return "draft";
}

export function renewalStatusLabel({
  status,
  endDate,
  hasRenewalAmendment,
}: {
  status: string;
  endDate: string;
  hasRenewalAmendment: boolean;
}): RenewalStatusLabel {
  if (status === "renewal_pending") return "renewal_pending";
  if (isLiveLeaseStatus(status) && expiresWithinDays(endDate, 90)) {
    return "renewal_soon";
  }
  if (hasRenewalAmendment) return "renewal_amendment_on_file";
  return "not_started";
}

export function leaseHealth({
  status,
  endDate,
  balance,
  monthlyAmount,
  hasOverdueInvoice,
  hasRenewalPending,
  hasRenewalAmendment,
}: {
  status: string;
  endDate: string;
  balance: number;
  monthlyAmount: number;
  hasOverdueInvoice: boolean;
  hasRenewalPending: boolean;
  hasRenewalAmendment: boolean;
}): LeaseHealth {
  const remaining = daysUntil(endDate);
  const significantlyOverdue =
    hasOverdueInvoice || (monthlyAmount > 0 && balance >= monthlyAmount);
  const endingSoonWithoutRenewal =
    remaining >= 0 &&
    remaining <= 30 &&
    !hasRenewalPending &&
    !hasRenewalAmendment;

  if (
    status === "expired" ||
    status === "terminated" ||
    status === "canceled" ||
    endingSoonWithoutRenewal ||
    significantlyOverdue
  ) {
    return "high_priority";
  }

  const smallBalance = balance > 0 && (monthlyAmount <= 0 || balance < monthlyAmount);
  if ((remaining >= 0 && remaining <= 90) || smallBalance) {
    return "attention_needed";
  }

  if (status === "active" && balance <= 0 && remaining > 90) {
    return "healthy";
  }

  return "attention_needed";
}

export function paymentStatusLabel(
  invoices: InvoiceBalanceInput[]
): PaymentStatusLabel {
  const billed = invoices.filter(
    (invoice) => invoice.status !== "void" && invoice.status !== "draft"
  );
  if (billed.length === 0) return "none_billed";
  if (billed.some((invoice) => invoice.status === "overdue")) return "overdue";
  if (leaseOpenBalance(invoices) > 0) return "partial";
  return "current";
}

export function nextRentDueDate(billingDay: number, from = new Date()) {
  const day = Math.min(Math.max(Math.round(billingDay) || 1, 1), 28);
  const today = startOfToday(from);
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (today.getDate() <= day) return formatDateInput(candidate);
  return formatDateInput(
    new Date(today.getFullYear(), today.getMonth() + 1, day)
  );
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatLeaseDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return dateStr;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return dateStr;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}
