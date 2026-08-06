"use client";

import { useRouter } from "next/navigation";
import { formatPeriodLabel } from "@/lib/statements/fee-components";

export type StatementPropertyOption = {
  id: string;
  name: string;
};

export function OwnerStatementFilters({
  properties,
  periods,
  selectedProperty,
  selectedPeriod,
  filteredCount,
  totalCount,
}: {
  properties: StatementPropertyOption[];
  periods: string[];
  selectedProperty: string | null;
  selectedPeriod: string | null;
  filteredCount: number;
  totalCount: number;
}) {
  const router = useRouter();

  function navigate(nextProperty: string | null, nextPeriod: string | null) {
    const params = new URLSearchParams();
    if (nextProperty) params.set("property", nextProperty);
    if (nextPeriod) params.set("period", nextPeriod);
    const query = params.toString();
    router.push(query ? `/owner/statements?${query}` : "/owner/statements");
  }

  const hasFilters = Boolean(selectedProperty || selectedPeriod);

  return (
    <div className="space-y-3 rounded-lg border border-slate-800/10 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-[12rem] flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Property
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] shadow-sm focus:border-[#c4784a] focus:outline-none focus:ring-1 focus:ring-[#c4784a]/40"
            value={selectedProperty ?? "all"}
            aria-label="Filter by property"
            onChange={(e) => {
              const value = e.target.value;
              navigate(value === "all" ? null : value, selectedPeriod);
            }}
          >
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[10rem] flex-1 sm:max-w-xs">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Statement period
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] shadow-sm focus:border-[#c4784a] focus:outline-none focus:ring-1 focus:ring-[#c4784a]/40"
            value={selectedPeriod ?? "all"}
            aria-label="Filter by statement period"
            onChange={(e) => {
              const value = e.target.value;
              navigate(selectedProperty, value === "all" ? null : value);
            }}
          >
            <option value="all">All periods</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {formatPeriodLabel(p)}
              </option>
            ))}
          </select>
        </label>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => navigate(null, null)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-600">
        Showing{" "}
        <span className="font-semibold tabular-nums text-[#0c1f2e]">
          {filteredCount}
        </span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums text-[#0c1f2e]">
          {totalCount}
        </span>{" "}
        statement{totalCount === 1 ? "" : "s"}
        {selectedProperty
          ? ` for ${
              properties.find((p) => p.id === selectedProperty)?.name ??
              "this property"
            }`
          : ""}
        {selectedPeriod ? ` · ${formatPeriodLabel(selectedPeriod)}` : ""}.
      </p>
    </div>
  );
}
