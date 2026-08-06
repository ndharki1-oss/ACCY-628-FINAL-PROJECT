import { formatMoney } from "@/lib/utils";

export type MixBarItem = {
  label: string;
  amount: number;
};

const BAR_TONES = [
  "bg-emerald-600",
  "bg-sky-600",
  "bg-amber-600",
  "bg-[#c4784a]",
  "bg-violet-600",
  "bg-slate-600",
  "bg-teal-600",
  "bg-rose-600",
];

/** Horizontal bar mix for income or OpEx composition. */
export function NoiMixBars({
  items,
  emptyLabel = "Nothing to show for this period.",
}: {
  items: MixBarItem[];
  emptyLabel?: string;
}) {
  const sorted = [...items]
    .filter((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((s, i) => s + i.amount, 0);

  if (sorted.length === 0 || total === 0) {
    return <p className="text-sm text-slate-600">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {sorted.map((item, idx) => {
        const pct = (item.amount / total) * 100;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="capitalize text-slate-700">{item.label}</span>
              <span className="shrink-0 tabular-nums text-[#0c1f2e]">
                <span className="font-semibold">{formatMoney(item.amount)}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {pct.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${BAR_TONES[idx % BAR_TONES.length]}`}
                style={{ width: `${Math.max(pct, 1.5)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
