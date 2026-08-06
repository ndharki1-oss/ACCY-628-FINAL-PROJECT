"use client";

import { formatMoney } from "@/lib/utils";

const COLLECTED_COLOR = "#6b8f71";
const OUTSTANDING_COLOR = "#c45c5c";

export function MonthlyRentBars({
  rentDue,
  collected,
  outstanding,
  collectionRate,
}: {
  rentDue: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
}) {
  if (rentDue <= 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No rent data available for this month.
      </p>
    );
  }

  const bars = [
    {
      key: "collected",
      label: "Collected",
      value: collected,
      color: COLLECTED_COLOR,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: outstanding,
      color: OUTSTANDING_COLOR,
    },
  ];

  const maxValue = Math.max(...bars.map((b) => b.value), rentDue, 1);

  const legend = [
    { label: "Rent Due", value: formatMoney(rentDue), swatch: null },
    {
      label: "Collected",
      value: formatMoney(collected),
      swatch: COLLECTED_COLOR,
    },
    {
      label: "Outstanding",
      value: formatMoney(outstanding),
      swatch: OUTSTANDING_COLOR,
    },
    {
      label: "Collection Rate",
      value: `${collectionRate.toFixed(1)}%`,
      swatch: null,
    },
  ];

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
      <div className="w-full min-w-0 flex-1">
        <p className="mb-3 text-center font-[family-name:var(--font-display)] text-xl text-[#0c1f2e] sm:text-left">
          {formatMoney(rentDue)}{" "}
          <span className="text-sm font-normal uppercase tracking-wider text-slate-500">
            Due
          </span>
        </p>
        <div
          className="flex h-52 items-end justify-center gap-8 sm:h-56 sm:justify-start sm:gap-10"
          role="img"
          aria-label={`Monthly rent overview. ${formatMoney(rentDue)} due. Collected ${formatMoney(collected)}. Outstanding ${formatMoney(outstanding)}.`}
        >
          {bars.map((bar, i) => {
            const heightPct = Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 4 : 0);
            return (
              <div
                key={bar.key}
                className="flex w-16 flex-col items-center gap-2 sm:w-20"
                style={{
                  animation: `rentBarIn 0.65s ease-out ${0.08 + i * 0.1}s both`,
                }}
              >
                <span className="text-xs tabular-nums text-slate-600">
                  {formatMoney(bar.value)}
                </span>
                <div className="flex h-40 w-full items-end sm:h-44">
                  <div
                    className="w-full rounded-t-md transition-opacity duration-200 hover:opacity-90"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: bar.color,
                      minHeight: bar.value > 0 ? "8px" : "0",
                    }}
                    title={`${bar.label} · ${formatMoney(bar.value)}`}
                  />
                </div>
                <span className="text-center text-xs text-slate-600">
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
        <style>{`
          @keyframes rentBarIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-3 text-sm sm:max-w-xs animate-[rentLegendIn_0.55s_ease-out_0.15s_both]">
        {legend.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0"
          >
            <span className="flex items-center gap-2 text-slate-600">
              {row.swatch ? (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: row.swatch }}
                  aria-hidden
                />
              ) : null}
              {row.label}
            </span>
            <span className="tabular-nums font-medium text-slate-900">
              {row.value}
            </span>
          </li>
        ))}
        <style>{`
          @keyframes rentLegendIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </ul>
    </div>
  );
}
