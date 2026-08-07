export type UserRole = "admin" | "owner" | "tenant" | "vendor" | "accounting";

/** DB / demo role → portal URL path (vendor portal is labeled Employee). */
export function roleHomePath(role: string): string {
  if (role === "vendor" || role === "staff") return "/employee";
  if (role === "accounting") return "/accounting";
  return `/${role}`;
}

/** DB role → nav/shell key used in the UI. */
export function roleShellKey(role: string): string {
  if (role === "vendor" || role === "staff") return "employee";
  return role;
}

/** Whether a pathname belongs to this DB role's portal. */
export function pathMatchesRole(pathname: string, role: string): boolean {
  // Accounting portal: dashboard at /accounting plus nested routes.
  if (role === "accounting") {
    return pathname === "/accounting" || pathname.startsWith("/accounting/");
  }
  const home = roleHomePath(role);
  return pathname === home || pathname.startsWith(`${home}/`);
}

export type CreditRating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC";

export type PropertyRiskTier = "standard" | "elevated" | "high";

/** Harborline management fee % of collected rent from tenant credit (4–12%)
 * plus property risk uplift (standard +0, elevated +1, high +2), capped at 14%.
 * Canonical for statements, remittance, and GL fee recognition.
 * Do not use management_agreements.fee_percent for billing math — that column is
 * an unweighted average of active-lease fees (display / fallback only).
 */
export function feePercentFromCredit(
  rating: CreditRating | string | null | undefined
): number {
  return feePercentFromCreditAndRisk(rating, "standard");
}

export function propertyRiskFeeUplift(
  risk: PropertyRiskTier | string | null | undefined
): number {
  if (risk === "elevated") return 1.0;
  if (risk === "high") return 2.0;
  return 0;
}

export function feePercentFromCreditAndRisk(
  rating: CreditRating | string | null | undefined,
  risk: PropertyRiskTier | string | null | undefined
): number {
  const map: Record<CreditRating, number> = {
    AAA: 4.0,
    AA: 5.0,
    A: 6.0,
    BBB: 7.5,
    BB: 9.0,
    B: 10.5,
    CCC: 12.0,
  };
  const base =
    rating && rating in map ? map[rating as CreditRating] : 7.5;
  return Math.min(base + propertyRiskFeeUplift(risk), 14);
}

export function formatFeePercent(n: number | string | null | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return `${Number.isFinite(v) ? v : 0}%`;
}

export function managementFeeFromCollection(
  collectedAmount: number,
  creditRating: CreditRating | string | null | undefined,
  risk: PropertyRiskTier | string | null | undefined = "standard"
) {
  const pct = feePercentFromCreditAndRisk(creditRating, risk);
  return Math.round(collectedAmount * (pct / 100) * 100) / 100;
}

export function formatMoney(n: number | string | null | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    // Display-only: negatives as ($1,234.56). Does not affect stored values or math.
    currencySign: "accounting",
  }).format(Number.isFinite(v) ? v : 0);
}

export function statusClass(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    paid: "bg-emerald-100 text-emerald-800",
    approved: "bg-emerald-100 text-emerald-800",
    sent: "bg-sky-100 text-sky-800",
    open: "bg-sky-100 text-sky-800",
    assigned: "bg-sky-100 text-sky-800",
    in_progress: "bg-amber-100 text-amber-900",
    partial: "bg-amber-100 text-amber-900",
    pending_owner_approval: "bg-amber-100 text-amber-900",
    overdue: "bg-rose-100 text-rose-800",
    disputed: "bg-rose-100 text-rose-800",
    rejected: "bg-rose-100 text-rose-800",
    void: "bg-slate-200 text-slate-700",
    canceled: "bg-slate-200 text-slate-700",
    expired: "bg-slate-200 text-slate-700",
    draft: "bg-slate-100 text-slate-700",
    held: "bg-indigo-100 text-indigo-800",
    occupied: "bg-emerald-100 text-emerald-800",
    vacant: "bg-slate-100 text-slate-700",
    reserved: "bg-indigo-100 text-indigo-800",
    under_maintenance: "bg-amber-100 text-amber-900",
    renewal_soon: "bg-amber-100 text-amber-900",
    renewal_pending: "bg-sky-100 text-sky-800",
    terminated: "bg-slate-200 text-slate-700",
    healthy: "bg-emerald-100 text-emerald-800",
    attention_needed: "bg-amber-100 text-amber-900",
    high_priority: "bg-rose-100 text-rose-800",
    renewal_amendment_on_file: "bg-indigo-100 text-indigo-800",
    not_started: "bg-slate-100 text-slate-700",
    current: "bg-emerald-100 text-emerald-800",
    none_billed: "bg-slate-100 text-slate-700",
    declined: "bg-rose-100 text-rose-800",
    leased: "bg-emerald-100 text-emerald-800",
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}
