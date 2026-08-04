export type UserRole = "admin" | "owner" | "tenant" | "vendor";

export function formatMoney(n: number | string | null | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}
