"use client";

import { useRouter } from "next/navigation";
import { formatAccountingPeriodLabel } from "@/lib/accounting/monthly-rent";

export function AccountingPeriodSelect({
  periods,
  selectedPeriod,
  basePath,
}: {
  periods: string[];
  selectedPeriod: string | null;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <label className="block max-w-xs">
      <span className="text-xs uppercase tracking-wider text-slate-500">
        Accounting period
      </span>
      <select
        className="mt-2 w-full rounded border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-800"
        value={selectedPeriod ?? "all"}
        onChange={(e) => {
          const value = e.target.value;
          router.push(
            value === "all"
              ? `${basePath}?period=all`
              : `${basePath}?period=${encodeURIComponent(value)}`
          );
        }}
        aria-label="Accounting period"
      >
        <option value="all">Total</option>
        {periods.map((p) => (
          <option key={p} value={p}>
            {formatAccountingPeriodLabel(p)}
          </option>
        ))}
      </select>
    </label>
  );
}
