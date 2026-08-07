import Link from "next/link";

/** Compact owner-local cue for pending property / My Items actions. */
export function OwnerActionPill({
  count,
  href,
  singular = "needs approval",
  plural = "need approval",
}: {
  count: number;
  href?: string;
  singular?: string;
  plural?: string;
}) {
  if (count <= 0) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Clear
      </span>
    );
  }

  const label = `${count} ${count === 1 ? singular : plural}`;
  const className =
    "inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600";

  if (href) {
    return (
      <Link href={href} className={className} title={label}>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-amber-200/80 px-1 tabular-nums text-amber-950">
          {count}
        </span>
        {count === 1 ? singular : plural}
      </Link>
    );
  }

  return (
    <span className={className}>
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-amber-200/80 px-1 tabular-nums text-amber-950">
        {count}
      </span>
      {count === 1 ? singular : plural}
    </span>
  );
}

export function OwnerNeedsApprovalFlag({
  label = "Needs approval",
}: {
  label?: string;
}) {
  return (
    <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950">
      {label}
    </span>
  );
}
