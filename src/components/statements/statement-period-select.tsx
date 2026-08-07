"use client";

import { useRouter } from "next/navigation";
import { formatPeriodLabel } from "@/lib/statements/fee-components";

export function StatementPeriodSelect({
  periods,
  selectedPeriod,
  basePath,
  onPeriodChange,
}: {
  periods: string[];
  /** `null` means All periods */
  selectedPeriod: string | null;
  basePath: string;
  /** Optional local handler — when set, called immediately so UI can update before navigation */
  onPeriodChange?: (period: string | null) => void;
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
          const next = value === "all" ? null : value;
          onPeriodChange?.(next);
          router.push(
            next === null
              ? `${basePath}?period=all`
              : `${basePath}?period=${encodeURIComponent(next)}`
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
