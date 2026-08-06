"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";

export type FeeRevenueLine = {
  id: string;
  amount: number;
  ownerName: string;
  propertyName: string;
  statementNumber: string;
  periodLabel: string;
  periodEnd: string;
  feeType: string;
  description: string;
};

type RangeMonths = 1 | 3 | 6 | 9 | 12 | 24;

const RANGE_OPTIONS: { months: RangeMonths; label: string }[] = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 9, label: "9 months" },
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
];

function todayIsoDate(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonthsLocal(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function lineDate(periodEnd: string): string | null {
  const key = periodEnd.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function filterLinesByRange(lines: FeeRevenueLine[], months: RangeMonths) {
  const end = todayIsoDate();
  const start = addMonthsLocal(end, -months);
  return lines.filter((line) => {
    const date = lineDate(line.periodEnd);
    if (!date) return false;
    return date >= start && date <= end;
  });
}

function FeeRevenueDialog({
  lines,
  onClose,
}: {
  lines: FeeRevenueLine[];
  onClose: () => void;
}) {
  const titleId = useId();
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [months, setMonths] = useState<RangeMonths>(12);

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.months === months)?.label ?? "1 year";

  const rangeLines = useMemo(
    () => filterLinesByRange(lines, months),
    [lines, months]
  );

  const rangeTotal = useMemo(
    () => rangeLines.reduce((sum, line) => sum + line.amount, 0),
    [rangeLines]
  );

  const ownerRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of rangeLines) {
      map.set(line.ownerName, (map.get(line.ownerName) ?? 0) + line.amount);
    }
    const needle = query.trim().toLowerCase();
    return [...map.entries()]
      .map(([ownerName, amount]) => ({ ownerName, amount }))
      .filter((row) =>
        needle ? row.ownerName.toLowerCase().includes(needle) : true
      )
      .sort((a, b) => b.amount - a.amount);
  }, [rangeLines, query]);

  const ownerTotal = ownerRows.reduce((s, r) => s + r.amount, 0);

  const detailLines = useMemo(() => {
    if (!selectedOwner) return [];
    const needle = query.trim().toLowerCase();
    return rangeLines
      .filter((line) => line.ownerName === selectedOwner)
      .filter((line) => {
        if (!needle) return true;
        return [
          line.propertyName,
          line.statementNumber,
          line.feeType,
          line.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        const byPeriod = b.periodEnd.localeCompare(a.periodEnd);
        if (byPeriod !== 0) return byPeriod;
        return b.amount - a.amount;
      });
  }, [rangeLines, selectedOwner, query]);

  const detailTotal = detailLines.reduce((s, l) => s + l.amount, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedOwner) setSelectedOwner(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, selectedOwner]);

  useEffect(() => {
    setQuery("");
  }, [selectedOwner, months]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0c1f2e]/55 p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close fee revenue breakdown"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 mt-4 w-full max-w-3xl overflow-hidden rounded-lg border border-slate-800/10 bg-[#f4f1ea] shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0c1f2e] px-5 py-4 text-[#f3efe6]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
              Fee revenue breakdown
            </p>
            <h3
              id={titleId}
              className="font-[family-name:var(--font-display)] text-xl"
            >
              {selectedOwner
                ? selectedOwner
                : "Fee revenue by owner company"}
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              {selectedOwner
                ? "Every fee line / statement for this owner."
                : "Totals by owner company for the selected range. Click an owner for statement-level detail."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Recognized total (GL 4000) · {rangeLabel}
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl text-[#0c1f2e]">
                {formatMoney(rangeTotal)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedOwner
                  ? `${selectedOwner}: ${formatMoney(detailTotal)} · ${detailLines.length} fee lines`
                  : `Owner view: ${formatMoney(ownerTotal)} · ${ownerRows.length} companies`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedOwner ? (
                <button
                  type="button"
                  onClick={() => setSelectedOwner(null)}
                  className="rounded border border-[#0c1f2e]/20 px-3 py-2 text-sm text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                >
                  ← All owners
                </button>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                  Range
                </span>
                <select
                  value={months}
                  onChange={(e) => {
                    setMonths(Number(e.target.value) as RangeMonths);
                    setSelectedOwner(null);
                  }}
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#c4784a] focus:ring-2"
                  aria-label="Fee revenue date range"
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option.months} value={option.months}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[12rem] text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                  Search
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    selectedOwner
                      ? "Property, statement, fee type…"
                      : "Owner company…"
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#c4784a] focus:ring-2"
                />
              </label>
            </div>
          </div>

          {!selectedOwner ? (
            <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-200 bg-white/70">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="sticky top-0 border-b bg-[#f4f1ea] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Owner company</th>
                    <th className="px-3 py-2">Amount ({rangeLabel})</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerRows.map((row) => (
                    <tr
                      key={row.ownerName}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedOwner(row.ownerName)}
                          className="text-left font-medium text-[#0645ad] underline underline-offset-2 hover:text-[#0b57d0]"
                        >
                          {row.ownerName}
                        </button>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[#0c1f2e]">
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))}
                  {ownerRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No owner fee totals for this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-200 bg-white/70">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 border-b bg-[#f4f1ea] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Property</th>
                    <th className="px-3 py-2">Statement</th>
                    <th className="px-3 py-2">Fee type</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="px-3 py-2 text-[#0c1f2e]">
                        {line.propertyName}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        <p>{line.statementNumber}</p>
                        <p className="mt-0.5 text-slate-500">
                          {line.periodLabel}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="capitalize text-[#0c1f2e]">
                          {line.feeType.replaceAll("_", " ")}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {line.description}
                        </p>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatMoney(line.amount)}
                      </td>
                    </tr>
                  ))}
                  {detailLines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No fee / statement lines for this owner.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function FeeRevenueRecognizedCard({
  total,
  lines,
}: {
  total: number;
  lines: FeeRevenueLine[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {open ? (
        <FeeRevenueDialog lines={lines} onClose={() => setOpen(false)} />
      ) : null}
      <div className="rounded-lg border border-slate-800/10 bg-white/80 p-5 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
            Fee Revenue Recognized (GAAP: on collection)
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-left font-[family-name:var(--font-display)] text-3xl text-[#0645ad] underline underline-offset-4 hover:text-[#0b57d0]"
        >
          {formatMoney(total)}
        </button>
        <p className="mt-2 text-sm text-slate-600">
          Click the amount for owner-company totals by date range (1 month–2
          years), then open an owner to see every fee / statement line.
        </p>
      </div>
    </div>
  );
}
