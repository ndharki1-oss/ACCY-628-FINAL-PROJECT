"use client";

import { formatMoney } from "@/lib/utils";
import type { NoiMonthPoint } from "@/components/owner/noi-trend-chart";

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

function formatAxisThousands(n: number): string {
  const k = n / 1000;
  const rounded = Math.round(k * 10) / 10;
  const abs = Math.abs(rounded).toFixed(1);
  return `${rounded < 0 ? "-" : ""}${abs}k`;
}

/** Simple multi-series trend for a single property (no portfolio picker). */
export function NoiPropertyTrendChart({ months }: { months: NoiMonthPoint[] }) {
  const series = months;
  if (series.length === 0) {
    return (
      <p className="text-sm text-slate-600">No monthly activity to chart yet.</p>
    );
  }

  const vals = series.flatMap((m) => [m.income, m.expense, m.noi, 0]);
  const yMin = Math.min(...vals);
  const yMax = Math.max(...vals);
  const pad = Math.max((yMax - yMin) * 0.08, 500);
  const domainMin = yMin === yMax ? yMin - pad : yMin - pad;
  const domainMax = yMin === yMax ? yMax + pad : yMax + pad;

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

  const yTicks = Array.from({ length: 5 }, (_, i) =>
    domainMin + ((domainMax - domainMin) * i) / 4
  );

  const latest = series[series.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-600" /> OpEx
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0c1f2e]" /> NOI
        </span>
        {latest ? (
          <span className="ml-auto tabular-nums text-slate-500">
            Latest NOI {formatMoney(latest.noi)}
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label="Property NOI trend"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={yAt(t) + 3}
              textAnchor="end"
              className="fill-slate-400"
              fontSize={10}
            >
              {formatAxisThousands(t)}
            </text>
          </g>
        ))}
        <path
          d={buildPath(
            series.map((m) => m.income),
            xAt,
            yAt
          )}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
        />
        <path
          d={buildPath(
            series.map((m) => m.expense),
            xAt,
            yAt
          )}
          fill="none"
          stroke="#d97706"
          strokeWidth={2}
        />
        <path
          d={buildPath(
            series.map((m) => m.noi),
            xAt,
            yAt
          )}
          fill="none"
          stroke="#0c1f2e"
          strokeWidth={2.5}
        />
        {series.map((m, i) => (
          <text
            key={m.key}
            x={xAt(i)}
            y={H - 12}
            textAnchor="middle"
            className="fill-slate-500"
            fontSize={10}
          >
            {m.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
