"use client";

import { useState } from "react";

const accents = {
  amber: {
    shell: "border-amber-200/80 bg-amber-50/40",
    bar: "bg-amber-700",
    title: "text-amber-950",
    chevron: "text-amber-800",
  },
  slate: {
    shell: "border-slate-300/80 bg-slate-50/50",
    bar: "bg-slate-600",
    title: "text-slate-900",
    chevron: "text-slate-600",
  },
  emerald: {
    shell: "border-emerald-200/80 bg-emerald-50/40",
    bar: "bg-emerald-700",
    title: "text-emerald-950",
    chevron: "text-emerald-800",
  },
  teal: {
    shell: "border-teal-200/80 bg-teal-50/40",
    bar: "bg-teal-700",
    title: "text-teal-950",
    chevron: "text-teal-800",
  },
  rose: {
    shell: "border-rose-200/80 bg-rose-50/40",
    bar: "bg-rose-700",
    title: "text-rose-950",
    chevron: "text-rose-800",
  },
  vacant: {
    shell: "border-slate-200 bg-white/70",
    bar: "bg-slate-400",
    title: "text-slate-800",
    chevron: "text-slate-500",
  },
} as const;

export type DashboardAccent = keyof typeof accents;

export function DashboardSection({
  title,
  accent,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  accent: DashboardAccent;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const a = accents[accent];

  return (
    <section className={`overflow-hidden rounded-lg border shadow-sm ${a.shell}`}>
      <div className={`h-1 w-full ${a.bar}`} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span
          className={`font-[family-name:var(--font-display)] text-lg ${a.title}`}
        >
          {title}
        </span>
        <span className="flex items-center gap-3">
          {action ? (
            <span
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {action}
            </span>
          ) : null}
          <span className={`text-sm ${a.chevron}`} aria-hidden>
            {open ? "−" : "+"}
          </span>
        </span>
      </button>
      {open ? <div className="border-t border-black/5 px-5 pb-5 pt-4">{children}</div> : null}
    </section>
  );
}
