"use client";

import { useRouter } from "next/navigation";
import {
  NOI_RANGE_OPTIONS,
  type NoiRangeKey,
} from "@/lib/owner/noi-period";

export function NoiRangePills({
  selected,
  basePath,
}: {
  selected: NoiRangeKey;
  /** e.g. `/owner/noi` or `/owner/noi/{id}` */
  basePath: string;
}) {
  const router = useRouter();

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm"
      role="group"
      aria-label="NOI date range"
    >
      {NOI_RANGE_OPTIONS.map((opt) => {
        const active = opt.key === selected;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              const path =
                opt.key === "month"
                  ? basePath
                  : `${basePath}?range=${opt.key}`;
              router.push(path);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-[#0c1f2e] text-[#f3efe6] shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#0c1f2e]"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
