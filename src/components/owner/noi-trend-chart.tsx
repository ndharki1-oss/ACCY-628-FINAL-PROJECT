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

/** Y-axis: thousands with one decimal, e.g. 12.5k / -0.4k */
function formatAxisThousands(n: number): string {
  const k = n / 1000;
  const rounded = Math.round(k * 10) / 10;
  const abs = Math.abs(rounded).toFixed(1);
  return `${rounded < 0 ? "-" : ""}${abs}k`;
}

function hasActivity(p: NoiMonthPoint) {
  return (
    Math.abs(p.income) > 0.005 ||
    Math.abs(p.expense) > 0.005 ||
    Math.abs(p.noi) > 0.005
  );
}

/** Drop leading empty months so the trend starts when data exists. */
function trimLeadingEmpty(points: NoiMonthPoint[]) {
  const first = points.findIndex(hasActivity);
  if (first <= 0) return points;
  return points.slice(first);
}

function buildPath(
  values: number[],
  xAt: (i: number) => number,
  yAt: (v: number) => number
) {
  if (values.length === 0) return "";
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(" ");
}

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

  const trimmedSource = useMemo(() => {
    const source =
      propertyId === "all"
        ? portfolio
        : (byProperty.find((p) => p.id === propertyId)?.months ?? []);
    return trimLeadingEmpty(source);
  }, [portfolio, byProperty, propertyId]);

  const available = trimmedSource.length;
  const rangeOptions = useMemo(() => {
    const opts: RangeMonths[] = [];
    if (available >= 1) opts.push(6);
    if (available > 6) opts.push(12);
    if (available > 12) opts.push(24);
    return opts;
  }, [available]);

  const effectiveRange = useMemo(() => {
    if (rangeOptions.includes(range)) return range;
    return rangeOptions[rangeOptions.length - 1] ?? 6;
  }, [range, rangeOptions]);

  const series = useMemo(() => {
    const cap = Math.min(effectiveRange, available);
    return trimmedSource.slice(-cap);
  }, [trimmedSource, effectiveRange, available]);

  const activeValues = useMemo(() => {
    const vals: number[] = [0];
    for (const m of series) {
      if (showIncome) vals.push(m.income);
      if (showExpense) vals.push(m.expense);
      if (showNoi) vals.push(m.noi);
    }
    return vals;
  }, [series, showIncome, showExpense, showNoi]);

  const yMin = Math.min(...activeValues);
  const yMax = Math.max(...activeValues);
  const pad = Math.max((yMax - yMin) * 0.08, 500);
  const domainMin = yMin === yMax ? yMin - pad : yMin - pad;
  const domainMax = yMin === yMax ? yMax + pad : yMax + pad;

  const latest = series[series.length - 1];
  const prior = series[series.length - 2];
  const delta =
    latest && prior && showNoi ? latest.noi - prior.noi : null;

  // SVG layout
  const W = 640;
  const H = 220;
  const padL = 48;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xAt = (i: number) => {
    if (series.length <= 1) return padL + plotW / 2;
    return padL + (i / (series.length - 1)) * plotW;
  };
  const yAt = (v: number) => {
    const t = (v - domainMin) / (domainMax - domainMin || 1);
    return padT + (1 - t) * plotH;
  };

  const yTicks = useMemo(() => {
    const ticks = 4;
    const out: number[] = [];
    for (let i = 0; i <= ticks; i += 1) {
      out.push(domainMin + ((domainMax - domainMin) * i) / ticks);
    }
    return out;
  }, [domainMin, domainMax]);

  const incomePath = buildPath(
    series.map((m) => m.income),
    xAt,
    yAt
  );
  const expensePath = buildPath(
    series.map((m) => m.expense),
    xAt,
    yAt
  );
  const noiPath = buildPath(
    series.map((m) => m.noi),
    xAt,
    yAt
  );

  const anySeries = showIncome || showExpense || showNoi;

  // X-axis label density: show ~6 labels max
  const labelStep = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
              Range
            </span>
            <select
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              value={effectiveRange}
              onChange={(e) => setRange(Number(e.target.value) as RangeMonths)}
            >
              {rangeOptions.map((r) => (
                <option key={r} value={r}>
                  {Math.min(r, available) < r
                    ? `All ${available} months`
                    : `${r} months`}
                </option>
              ))}
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
      </div>

      {latest && showNoi ? (
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Latest NOI
            </p>
            <p
              className={`mt-0.5 font-[family-name:var(--font-display)] text-xl tabular-nums ${
                latest.noi < 0 ? "text-rose-700" : "text-teal-900"
              }`}
            >
              {formatMoney(latest.noi)}
            </p>
            <p className="text-xs text-slate-500">{latest.label}</p>
          </div>
          {delta != null ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                vs prior month
              </p>
              <p
                className={`mt-0.5 font-[family-name:var(--font-display)] text-xl tabular-nums ${
                  delta < 0 ? "text-rose-700" : "text-teal-800"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {formatMoney(delta)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {!anySeries ? (
        <p className="text-sm text-slate-600">Turn on at least one series.</p>
      ) : series.length === 0 ? (
        <p className="text-sm text-slate-600">No NOI history for this selection yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-teal-100 bg-white/80 p-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full min-w-[28rem] font-[family-name:var(--font-sans)]"
            role="img"
            aria-label="NOI trend over time"
          >
            {/* Grid + Y axis */}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={padL - 8}
                  y={yAt(tick) + 3}
                  textAnchor="end"
                  className="fill-slate-500"
                  fontSize={10}
                >
                  {formatAxisThousands(tick)}
                </text>
              </g>
            ))}
            {/* Zero line when in domain */}
            {domainMin < 0 && domainMax > 0 ? (
              <line
                x1={padL}
                x2={W - padR}
                y1={yAt(0)}
                y2={yAt(0)}
                stroke="#94a3b8"
                strokeWidth={1.25}
                strokeDasharray="4 3"
              />
            ) : null}

            {showIncome ? (
              <path
                d={incomePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {showExpense ? (
              <path
                d={expensePath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {showNoi ? (
              <path
                d={noiPath}
                fill="none"
                stroke="#0f766e"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}

            {/* NOI dots for glance */}
            {showNoi
              ? series.map((m, i) => (
                  <circle
                    key={m.key}
                    cx={xAt(i)}
                    cy={yAt(m.noi)}
                    r={3}
                    className={m.noi < 0 ? "fill-rose-600" : "fill-teal-700"}
                  >
                    <title>
                      {m.label}: NOI {formatMoney(m.noi)}
                      {showIncome ? ` · Income ${formatMoney(m.income)}` : ""}
                      {showExpense ? ` · Expenses ${formatMoney(m.expense)}` : ""}
                    </title>
                  </circle>
                ))
              : null}

            {/* X labels */}
            {series.map((m, i) =>
              i % labelStep === 0 || i === series.length - 1 ? (
                <text
                  key={`lbl-${m.key}`}
                  x={xAt(i)}
                  y={H - 10}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize={10}
                >
                  {m.label}
                </text>
              ) : null
            )}
          </svg>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            {showIncome ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-sky-600" /> Income
              </span>
            ) : null}
            {showExpense ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-slate-400" /> Expenses
              </span>
            ) : null}
            {showNoi ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-teal-700" /> NOI
              </span>
            ) : null}
            <span className="text-slate-400">Axis in thousands (k)</span>
          </div>
        </div>
      )}
    </div>
  );
}
