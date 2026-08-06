"use client";

import { MetricInfoTip } from "@/components/owner/metric-info-tip";

/**
 * Page/section title with optional vital line (always visible) and
 * optional ⓘ tip for helpful / judgment-call copy.
 */
export function PageHeading({
  title,
  vital,
  info,
  as = "h1",
  className = "",
}: {
  title: React.ReactNode;
  /** Keep visible — definition/routing needed to read the page */
  vital?: React.ReactNode;
  /** Moved behind circled i */
  info?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  const TitleTag = as;

  const titleClass =
    as === "h1"
      ? "font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0c1f2e]"
      : "font-[family-name:var(--font-display)] text-xl text-slate-800";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <TitleTag className={titleClass}>{title}</TitleTag>
        {info ? (
          <MetricInfoTip
            label={typeof title === "string" ? title : "About"}
            detail={info}
            wide
          />
        ) : null}
      </div>
      {vital ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          {vital}
        </p>
      ) : null}
    </div>
  );
}
