"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aggregatePropertyPnLChart,
  metricLabel,
  outlierBarColor,
  resolveChartDateRange,
  type PropertyPnLChartActivity,
  type PropertyPnLChartMetric,
  type PropertyPnLChartRangePreset,
} from "@/lib/reports/property-pnl-chart";
import { formatMoney } from "@/lib/utils";

const AVG_COLOR = "#64748b";

const RANGE_OPTIONS: { value: PropertyPnLChartRangePreset; label: string }[] = [
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "12m", label: "Last 12 Months" },
  { value: "all", label: "All Periods" },
  { value: "custom", label: "Custom" },
];

const METRIC_OPTIONS: { value: PropertyPnLChartMetric; label: string }[] = [
  { value: "noi", label: "NOI" },
  { value: "revenue", label: "Revenue" },
  { value: "expenses", label: "OpEx" },
];

const controlClass =
  "rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

export function PropertyNoiBarChart({
  activity,
  owners,
  ownerFilter,
  onOwnerFilterChange,
}: {
  activity: PropertyPnLChartActivity[];
  owners: string[];
  ownerFilter: string;
  onOwnerFilterChange: (owner: string) => void;
}) {
  const [preset, setPreset] = useState<PropertyPnLChartRangePreset>("12m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [metric, setMetric] = useState<PropertyPnLChartMetric>("noi");

  const range = useMemo(
    () => resolveChartDateRange({ preset, customStart, customEnd }),
    [preset, customStart, customEnd]
  );

  const aggregated = useMemo(
    () =>
      aggregatePropertyPnLChart(activity, {
        ownerName: ownerFilter === "all" ? "all" : ownerFilter,
        range,
      }),
    [activity, ownerFilter, range]
  );

  const average =
    aggregated.length === 0
      ? 0
      : aggregated.reduce((sum, row) => sum + row[metric], 0) /
        aggregated.length;
  const higherIsBetter = metric !== "expenses";

  const chartData = useMemo(() => {
    return [...aggregated]
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 15)
      .map((row) => {
        const value = row[metric];
        return {
          name: row.propertyName,
          value,
          fill: outlierBarColor(value, average, higherIsBetter),
        };
      });
  }, [aggregated, metric, average, higherIsBetter]);

  const metricName = metricLabel(metric);
  const topCount = chartData.length;
  const filteredCount = aggregated.length;
  const avgLabel = `Avg ${metricName}: ${formatMoney(average).replace(/\.00$/, "")}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-[#f3efe6]/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {metricName} by property
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {topCount === 0
              ? `Top 15 by ${metricName}`
              : filteredCount > 15
                ? `Top ${topCount} by ${metricName} · of ${filteredCount} filtered`
                : `Top ${topCount} by ${metricName}`}
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

          <label className="block text-xs">
            <span className="mb-1 block uppercase tracking-wide text-slate-500">
              Owner
            </span>
            <select
              value={ownerFilter}
              onChange={(e) => onOwnerFilterChange(e.target.value)}
              className={`${controlClass} max-w-[12rem]`}
              aria-label="Filter chart by owner"
            >
              <option value="all">All owners</option>
              {owners.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div
            className="inline-flex self-end rounded border border-slate-300 bg-white p-0.5 text-xs font-medium"
            role="group"
            aria-label="Chart metric"
          >
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMetric(option.value)}
                className={`rounded px-2.5 py-1.5 transition ${
                  metric === option.value
                    ? "bg-[#0c1f2e] text-[#f3efe6]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 h-64 w-full">
        {topCount > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
                tickFormatter={(value: number) =>
                  formatMoney(value).replace(/\.00$/, "")
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => {
                  const numeric =
                    typeof value === "number" ? value : Number(value);
                  return [
                    formatMoney(Number.isFinite(numeric) ? numeric : 0),
                    metricName,
                  ];
                }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e2e8f0",
                  backgroundColor: "#fdfbf7",
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                x={average}
                stroke={AVG_COLOR}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: avgLabel,
                  position: "insideTopRight",
                  fill: AVG_COLOR,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-[#fdfbf7] text-sm text-slate-500">
            {preset === "custom" && (!customStart || !customEnd)
              ? "Select a custom start and end date."
              : "No properties match the current chart filters."}
          </div>
        )}
      </div>
    </div>
  );
}
