"use client";

import { useRouter } from "next/navigation";
import { formatPeriodLabel } from "@/lib/statements/fee-components";

export function StatementPeriodSelect({
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
        Statement period
      </span>
      <select
        className="mt-2 w-full rounded border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-800"
        value={selectedPeriod ?? "all"}
        onChange={(e) => {
          const value = e.target.value;
          router.push(
            value === "all" ? basePath : `${basePath}?period=${encodeURIComponent(value)}`
          );
        }}
        aria-label="Statement period"
      >
        <option value="all">All</option>
        {periods.map((p) => (
          <option key={p} value={p}>
            {formatPeriodLabel(p)}
          </option>
        ))}
      </select>
    </label>
  );
}
