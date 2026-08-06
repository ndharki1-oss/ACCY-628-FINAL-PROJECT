"use client";

import { MetricInfoTip } from "@/components/owner/metric-info-tip";

export function StatWithDetail({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="relative rounded-lg border border-slate-800/10 bg-[#0c1f2e] p-4 text-[#f3efe6]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <MetricInfoTip label={label} detail={detail} tone="dark" />
      </div>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
    </div>
  );
}
