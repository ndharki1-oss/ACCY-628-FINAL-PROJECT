"use client";

import { useEffect, useId, useRef, useState } from "react";

export function StatWithDetail({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative rounded-lg border border-slate-800/10 bg-[#0c1f2e] p-4 text-[#f3efe6]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        <button
          type="button"
          aria-label={`${label} details`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-500/60 text-[11px] font-semibold leading-none text-slate-300 transition hover:border-slate-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
        >
          i
        </button>
      </div>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} details`}
          className="absolute left-0 right-0 top-[calc(100%-0.25rem)] z-20 mt-1 rounded-lg border border-slate-700 bg-[#132a3c] p-3 text-xs leading-relaxed text-slate-200 shadow-lg"
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}
