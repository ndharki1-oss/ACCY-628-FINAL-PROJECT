import { formatMoney } from "@/lib/utils";

export type BreakdownPieSlice = {
  label: string;
  value: number;
  color: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function formatPiePercent(value: number, total: number) {
  const pct = (value / total) * 100;
  if (pct > 0 && pct < 1) return "<1";
  return pct.toFixed(1);
}

const COLORS = [
  "#0c1f2e",
  "#c4784a",
  "#3d6b8c",
  "#6b8f71",
  "#8b6b4f",
  "#5c6b7a",
  "#a67c52",
];

/** Highlight color for key slices (base management fee / payroll). */
export const PIE_ACCENT_RED = "#c45c5c";

export function withPieColors(
  rows: { label: string; value: number }[],
  colorByLabel?: Record<string, string>
): BreakdownPieSlice[] {
  return rows.map((r, i) => ({
    ...r,
    color: colorByLabel?.[r.label] ?? COLORS[i % COLORS.length]!,
  }));
}

export function BreakdownPie({
  slices,
  emptyMessage = "No data to chart.",
}: {
  slices: BreakdownPieSlice[];
  emptyMessage?: string;
}) {
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((s, x) => s + x.value, 0);

  if (total <= 0 || positive.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  const cx = 80;
  const cy = 80;
  const r = 70;
  let angle = 0;
  const paths =
    positive.length === 1
      ? [
          {
            ...positive[0]!,
            d: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`,
          },
        ]
      : positive.map((s) => {
          const sweep = (s.value / total) * 360;
          const start = angle;
          const end = angle + sweep;
          angle = end;
          return { ...s, d: slicePath(cx, cy, r, start, end) };
        });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 160 160"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label="Breakdown pie chart"
      >
        {paths.map((p) => {
          const pct = formatPiePercent(p.value, total);
          const tip = `${p.label} · ${formatMoney(p.value)} · ${pct}%`;
          return (
            <path
              key={p.label}
              d={p.d}
              fill={p.color}
              className="cursor-pointer transition-opacity hover:opacity-85"
            >
              <title>{tip}</title>
            </path>
          );
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {positive.map((s) => {
          const pct = formatPiePercent(s.value, total);
          return (
            <li key={s.label} className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className="truncate text-slate-700">
                  {s.label}{" "}
                  <span className="text-slate-400">({pct}%)</span>
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-slate-800">
                {formatMoney(s.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
