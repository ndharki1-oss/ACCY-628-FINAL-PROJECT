"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildMgmtPnlInsight,
  fillMgmtPnlMonthlySeries,
  shortMonthLabel,
  type MgmtPnlMonthlyPoint,
} from "@/lib/reports/mgmt-pnl-monthly";
import {
  resolveChartDateRange,
  type PropertyPnLChartRangePreset,
} from "@/lib/reports/property-pnl-chart";
import { formatMoney } from "@/lib/utils";

const COLORS = {
  fee: "#0c1f2e",
  opex: "#c4784a",
  contribution: "#059669",
  avg: "#64748b",
} as const;

const RANGE_OPTIONS: { value: PropertyPnLChartRangePreset; label: string }[] = [
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "12m", label: "Last 12 Months" },
  { value: "all", label: "All Periods" },
  { value: "custom", label: "Custom" },
];

const controlClass =
  "rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

function moneyShort(value: number) {
  return formatMoney(value).replace(/\.00$/, "");
}

export function MgmtPnlMonthlyChart({
  series,
}: {
  series: MgmtPnlMonthlyPoint[];
  periodLabel?: string;
}) {
  const [preset, setPreset] = useState<PropertyPnLChartRangePreset>("3m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const range = useMemo(
    () => resolveChartDateRange({ preset, customStart, customEnd }),
    [preset, customStart, customEnd]
  );

  // One point per month in the selected range (zeros when sparse seed months).
  const filledSeries = useMemo(() => {
    if (preset === "custom" && (!customStart || !customEnd)) return [];
    return fillMgmtPnlMonthlySeries(series, range);
  }, [series, range, preset, customStart, customEnd]);

  const totals = useMemo(() => {
    return filledSeries.reduce(
      (acc, row) => {
        acc.feeRevenue += row.feeRevenue;
        acc.operatingCosts += row.operatingCosts;
        acc.contribution += row.contribution;
        return acc;
      },
      { feeRevenue: 0, operatingCosts: 0, contribution: 0 }
    );
  }, [filledSeries]);

  const avgContribution =
    filledSeries.length === 0
      ? 0
      : totals.contribution / filledSeries.length;

  const chartData = useMemo(() => {
    return filledSeries.map((point) => ({
      period: point.period,
      label: point.label,
      shortLabel: shortMonthLabel(point.period),
      "Fee Revenue": point.feeRevenue,
      "Operating Costs": point.operatingCosts,
      Contribution: point.contribution,
      ContributionFill: point.contribution,
    }));
  }, [filledSeries]);

  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [0, 1];
    let min = 0;
    let max = 0;
    for (const row of chartData) {
      for (const key of [
        "Fee Revenue",
        "Operating Costs",
        "Contribution",
      ] as const) {
        min = Math.min(min, row[key]);
        max = Math.max(max, row[key]);
      }
      min = Math.min(min, avgContribution);
      max = Math.max(max, avgContribution);
    }
    if (min === max) {
      const pad = Math.max(Math.abs(max) * 0.15, 1000);
      return [min - pad, max + pad];
    }
    const pad = (max - min) * 0.12;
    return [min - pad, max + pad];
  }, [chartData, avgContribution]);

  const insight = useMemo(
    () => buildMgmtPnlInsight(filledSeries),
    [filledSeries]
  );

  const rangeCaption =
    RANGE_OPTIONS.find((option) => option.value === preset)?.label ??
    "Date range";

  return (
    <div className="rounded-lg border border-slate-200 bg-[#f3efe6]/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Fee · OpEx · Contribution
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {rangeCaption}
            {filledSeries.length > 0
              ? ` · ${filledSeries.length} month${filledSeries.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs">
            <span className="mb-1 block uppercase tracking-wide text-slate-500">
              Date range
            </span>
            <select
              value={preset}
              onChange={(e) =>
                setPreset(e.target.value as PropertyPnLChartRangePreset)
              }
              className={controlClass}
              aria-label="Chart date range"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {preset === "custom" ? (
            <>
              <label className="block text-xs">
                <span className="mb-1 block uppercase tracking-wide text-slate-500">
                  Start
                </span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={controlClass}
                  aria-label="Custom start date"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block uppercase tracking-wide text-slate-500">
                  End
                </span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={controlClass}
                  aria-label="Custom end date"
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded border border-slate-200/80 bg-[#fdfbf7]/90 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Fee revenue
          </p>
          <p className="mt-0.5 text-sm font-medium text-[#0c1f2e]">
            {moneyShort(totals.feeRevenue)}
          </p>
        </div>
        <div className="rounded border border-slate-200/80 bg-[#fdfbf7]/90 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Operating costs
          </p>
          <p className="mt-0.5 text-sm font-medium text-[#c4784a]">
            {moneyShort(totals.operatingCosts)}
          </p>
        </div>
        <div className="rounded border border-slate-200/80 bg-[#fdfbf7]/90 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Contribution
          </p>
          <p
            className={`mt-0.5 text-sm font-medium ${
              totals.contribution < 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {moneyShort(totals.contribution)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-52 w-full">
        {preset === "custom" && (!customStart || !customEnd) ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-[#fdfbf7] text-sm text-slate-500">
            Select a custom start and end date.
          </div>
        ) : filledSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="contribAreaFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={COLORS.contribution}
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS.contribution}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(value: number) => moneyShort(value)}
              />
              <Tooltip
                formatter={(value, name) => {
                  const numeric =
                    typeof value === "number" ? value : Number(value);
                  return [
                    moneyShort(Number.isFinite(numeric) ? numeric : 0),
                    String(name),
                  ];
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as
                    | { label?: string }
                    | undefined;
                  return row?.label ?? "";
                }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e2e8f0",
                  backgroundColor: "#fdfbf7",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 0 }}
                iconType="circle"
              />
              <ReferenceLine
                y={avgContribution}
                stroke={COLORS.avg}
                strokeDasharray="5 4"
                strokeWidth={1.25}
                label={{
                  value: `Avg Contribution: ${moneyShort(avgContribution)}`,
                  position: "insideTopRight",
                  fill: COLORS.avg,
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="ContributionFill"
                stroke="none"
                fill="url(#contribAreaFill)"
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="Fee Revenue"
                stroke={COLORS.fee}
                strokeWidth={2}
                dot={{ r: 2.5, fill: COLORS.fee, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Operating Costs"
                stroke={COLORS.opex}
                strokeWidth={2}
                dot={{ r: 2.5, fill: COLORS.opex, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Contribution"
                stroke={COLORS.contribution}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLORS.contribution, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-[#fdfbf7] text-sm text-slate-500">
            No fee or cost activity for this range.
          </div>
        )}
      </div>

      {filledSeries.length > 0 ? (
        <p className="mt-3 text-sm text-slate-600">{insight}</p>
      ) : null}
    </div>
  );
}
