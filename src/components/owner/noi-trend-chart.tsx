"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";

export type NoiMonthPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  noi: number;
};

export type NoiPropertySeries = {
  id: string;
  name: string;
  months: NoiMonthPoint[];
};

type RangeMonths = 6 | 12 | 24;

export function NoiTrendChart({
  portfolio,
  byProperty,
}: {
  portfolio: NoiMonthPoint[];
  byProperty: NoiPropertySeries[];
}) {
  const [range, setRange] = useState<RangeMonths>(12);
  const [propertyId, setPropertyId] = useState<string>("all");
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showNoi, setShowNoi] = useState(true);

  const series = useMemo(() => {
    const source =
      propertyId === "all"
        ? portfolio
        : (byProperty.find((p) => p.id === propertyId)?.months ?? []);
    return source.slice(-range);
  }, [portfolio, byProperty, propertyId, range]);

  const maxAbs = Math.max(
    1,
    ...series.flatMap((m) => {
      const vals: number[] = [];
      if (showIncome) vals.push(Math.abs(m.income));
      if (showExpense) vals.push(Math.abs(m.expense));
      if (showNoi) vals.push(Math.abs(m.noi));
      return vals;
    })
  );

  const barPct = (n: number) => `${Math.max(2, (Math.abs(n) / maxAbs) * 100)}%`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Range
          </span>
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as RangeMonths)}
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Property
          </span>
          <select
            className="min-w-[12rem] rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="all">All properties</option>
            {byProperty.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-wrap gap-3 text-sm text-slate-700">
          <legend className="mb-1 w-full text-xs uppercase tracking-wide text-slate-500">
            Series
          </legend>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showIncome}
              onChange={(e) => setShowIncome(e.target.checked)}
            />
            Income
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showExpense}
              onChange={(e) => setShowExpense(e.target.checked)}
            />
            Expenses
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showNoi}
              onChange={(e) => setShowNoi(e.target.checked)}
            />
            NOI
          </label>
        </fieldset>
      </div>

      {!showIncome && !showExpense && !showNoi ? (
        <p className="text-sm text-slate-600">Turn on at least one series.</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div
            className="flex min-w-full items-end gap-2"
            style={{ minHeight: 180 }}
          >
            {series.map((m) => (
              <div
                key={m.key}
                className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-40 w-full items-end justify-center gap-0.5">
                  {showIncome ? (
                    <div
                      title={`Income ${formatMoney(m.income)}`}
                      className="w-full max-w-[0.85rem] rounded-t bg-sky-600/80"
                      style={{ height: barPct(m.income) }}
                    />
                  ) : null}
                  {showExpense ? (
                    <div
                      title={`Expenses ${formatMoney(m.expense)}`}
                      className="w-full max-w-[0.85rem] rounded-t bg-slate-400"
                      style={{ height: barPct(m.expense) }}
                    />
                  ) : null}
                  {showNoi ? (
                    <div
                      title={`NOI ${formatMoney(m.noi)}`}
                      className={`w-full max-w-[0.85rem] rounded-t ${
                        m.noi < 0 ? "bg-rose-600" : "bg-teal-700"
                      }`}
                      style={{ height: barPct(m.noi) }}
                    />
                  ) : null}
                </div>
                <p className="text-center text-[10px] leading-tight text-slate-500">
                  {m.label}
                </p>
                {showNoi ? (
                  <p
                    className={`text-center text-[10px] font-medium tabular-nums ${
                      m.noi < 0 ? "text-rose-700" : "text-teal-900"
                    }`}
                  >
                    {formatMoney(m.noi)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
            {showIncome ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-sky-600/80" /> Income
              </span>
            ) : null}
            {showExpense ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-slate-400" /> Expenses
              </span>
            ) : null}
            {showNoi ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-teal-700" /> NOI
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
