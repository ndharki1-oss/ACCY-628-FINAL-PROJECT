export type OwnerStatementDocumentLine = {
  lineType: string;
  description: string;
  amount: number;
};

export type OwnerStatementDocumentData = {
  statementId: string;
  statementNumber: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  propertyName: string;
  propertyAddress: string | null;
  ownerName: string;
  totalCollections: number;
  totalExpenses: number;
  projectFee: number;
  managementFee: number;
  remittanceDue: number;
  lines: OwnerStatementDocumentLine[];
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

export function formatStatementDisplayDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!month || month < 1 || month > 12) return String(iso);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export function formatStatementMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}
