"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildPaymentTimingSeries } from "@/lib/billing-payment-timing";
import type { BillingInvoiceRow } from "@/lib/billing-payments";
import { formatMoney } from "@/lib/utils";

type MetricMode = "count" | "amount";

const RANGE_OPTIONS = [
  { months: 1, label: "Past month" },
  { months: 3, label: "Past 3 months" },
  { months: 6, label: "Past 6 months" },
  { months: 9, label: "Past 9 months" },
  { months: 12, label: "Past year" },
] as const;

const COLORS = {
  early: "#059669",
  onTime: "#0284c7",
  late: "#e11d48",
} as const;

export function AdminBillingPaymentTimingChart({
  invoices,
}: {
  invoices: BillingInvoiceRow[];
}) {
  const [metric, setMetric] = useState<MetricMode>("count");
  const [months, setMonths] = useState(6);

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.months === months)?.label ?? "Past 6 months";

  const series = useMemo(
    () => buildPaymentTimingSeries(invoices, { months }),
    [invoices, months]
  );

  const chartData = useMemo(
    () =>
      series.map((point) => ({
        label: point.label,
        Early: metric === "count" ? point.earlyCount : point.earlyAmount,
        "On-Time": metric === "count" ? point.onTimeCount : point.onTimeAmount,
        Late: metric === "count" ? point.lateCount : point.lateAmount,
      })),
    [metric, series]
  );

  const hasData = chartData.some(
    (row) => row.Early > 0 || row["On-Time"] > 0 || row.Late > 0
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Payment timing
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {rangeLabel} by invoice issue date
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="block text-xs">
            <span className="mb-1 block uppercase tracking-wide text-slate-500">
              Range
            </span>
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2"
              aria-label="Chart date range"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.months} value={option.months}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="inline-flex self-end rounded border border-slate-300 bg-white p-0.5 text-xs font-medium"
            role="group"
            aria-label="Chart metric"
          >
            <button
              type="button"
              onClick={() => setMetric("count")}
              className={`rounded px-2.5 py-1.5 transition ${
                metric === "count"
                  ? "bg-[#0c1f2e] text-[#f3efe6]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Number of Invoices
            </button>
            <button
              type="button"
              onClick={() => setMetric("amount")}
              className={`rounded px-2.5 py-1.5 transition ${
                metric === "amount"
                  ? "bg-[#0c1f2e] text-[#f3efe6]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Dollar Amount
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 h-52 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={metric === "count" ? false : true}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={metric === "amount" ? 64 : 36}
                tickFormatter={(value: number) =>
                  metric === "amount"
                    ? formatMoney(value).replace(/\.00$/, "")
                    : String(value)
                }
              />
              <Tooltip
                formatter={(value, name) => {
                  const numeric = typeof value === "number" ? value : Number(value);
                  const display =
                    metric === "amount"
                      ? formatMoney(Number.isFinite(numeric) ? numeric : 0)
                      : String(Number.isFinite(numeric) ? numeric : 0);
                  return [display, String(name)];
                }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                iconType="circle"
              />
              <Bar
                dataKey="Early"
                stackId="timing"
                fill={COLORS.early}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="On-Time"
                stackId="timing"
                fill={COLORS.onTime}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Late"
                stackId="timing"
                fill={COLORS.late}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            No paid or overdue invoices in this range.
          </div>
        )}
      </div>
    </div>
  );
}
