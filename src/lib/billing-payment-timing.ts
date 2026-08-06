import type { BillingInvoiceRow } from "@/lib/billing-payments";
import { paymentTiming } from "@/lib/billing-payments";

export type InvoiceTimingBucket = "early" | "on_time" | "late";

export type PaymentTimingMonthPoint = {
  monthKey: string;
  label: string;
  earlyCount: number;
  onTimeCount: number;
  lateCount: number;
  earlyAmount: number;
  onTimeAmount: number;
  lateAmount: number;
};

function parseIsoDate(value: string) {
  // Prefer date-only ISO (YYYY-MM-DD) to avoid timezone day shifts.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return { year, month, day, iso: `${match[1]}-${match[2]}-${match[3]}` };
}

function todayIsoLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKeyFromIssue(issueDate: string) {
  const parsed = parseIsoDate(issueDate);
  if (!parsed) return null;
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function lastNMonthKeys(n: number, asOf = new Date()) {
  const keys: string[] = [];
  const cursor = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    keys.push(`${year}-${month}`);
  }
  return keys;
}

/**
 * Invoice-level timing for the payment chart:
 * - Early / On-Time / Late from settlement payment date vs due date when paid
 * - Unpaid past due → Late
 * - Unpaid not yet due → excluded (null)
 */
export function classifyInvoicePaymentTiming(
  invoice: BillingInvoiceRow,
  today = todayIsoLocal()
): InvoiceTimingBucket | null {
  const due = parseIsoDate(invoice.dueDate)?.iso;
  if (!due) return null;

  const balance = Math.max(invoice.total - invoice.amountPaid, 0);
  const isPaid = balance <= 0.009;

  if (!isPaid) {
    if (today > due) return "late";
    return null;
  }

  const paymentDates = invoice.payments
    .map((payment) => parseIsoDate(payment.paymentDate)?.iso)
    .filter((value): value is string => Boolean(value))
    .sort();

  const settlementDate =
    paymentDates.length > 0
      ? paymentDates[paymentDates.length - 1]
      : // Fully paid without payment applications still needs a timing; treat as on-time.
        due;

  return paymentTiming(due, settlementDate);
}

export function buildPaymentTimingSeries(
  invoices: BillingInvoiceRow[],
  options?: { months?: number; today?: string }
): PaymentTimingMonthPoint[] {
  const months = options?.months ?? 6;
  const today = options?.today ?? todayIsoLocal();
  const monthKeys = lastNMonthKeys(months);
  const monthSet = new Set(monthKeys);

  const buckets = new Map<string, PaymentTimingMonthPoint>();
  for (const key of monthKeys) {
    buckets.set(key, {
      monthKey: key,
      label: monthLabel(key),
      earlyCount: 0,
      onTimeCount: 0,
      lateCount: 0,
      earlyAmount: 0,
      onTimeAmount: 0,
      lateAmount: 0,
    });
  }

  for (const invoice of invoices) {
    const key = monthKeyFromIssue(invoice.issueDate);
    if (!key || !monthSet.has(key)) continue;

    const timing = classifyInvoicePaymentTiming(invoice, today);
    if (!timing) continue;

    const point = buckets.get(key);
    if (!point) continue;

    const amount = Number(invoice.total) || 0;
    if (timing === "early") {
      point.earlyCount += 1;
      point.earlyAmount += amount;
    } else if (timing === "on_time") {
      point.onTimeCount += 1;
      point.onTimeAmount += amount;
    } else {
      point.lateCount += 1;
      point.lateAmount += amount;
    }
  }

  return monthKeys.map((key) => buckets.get(key)!);
}
