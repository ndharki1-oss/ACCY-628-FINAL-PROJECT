export type InvoiceDocumentLine = {
  description: string;
  lineType: string;
  amount: number;
};

export type InvoiceDocumentData = {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  disputeReason: string | null;
  propertyName: string;
  propertyAddress: string | null;
  tenantCompany: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  lines: InvoiceDocumentLine[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatInvoiceDisplayDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!month || month < 1 || month > 12) return String(iso);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/** "HL-16 base rent 2026-08" → "August HL-16 base rent" */
export function formatInvoiceLineDescription(description: string) {
  const match = description.match(/^(.*)\s+(\d{4})-(\d{2})\s*$/);
  if (!match) return description;
  const descriptor = match[1].trim();
  const month = Number(match[3]);
  if (!descriptor || !month || month < 1 || month > 12) return description;
  return `${MONTH_NAMES[month - 1]} ${descriptor}`;
}

export function formatInvoiceMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}
