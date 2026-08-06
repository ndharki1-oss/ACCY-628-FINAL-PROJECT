"use client";

import { useEffect, useId, useRef, useState } from "react";

export function MetricInfoTip({
  label,
  detail,
  tone = "light",
  wide = false,
}: {
  label: string;
  detail: string;
  tone?: "light" | "dark";
  /** Wider popover for page-heading help copy */
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
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

  const buttonClass =
    tone === "dark"
      ? "border-slate-500/60 text-slate-300 hover:border-slate-300 hover:text-white focus-visible:outline-slate-300"
      : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-800 focus-visible:outline-slate-400";

  const panelClass =
    tone === "dark"
      ? "border-slate-700 bg-[#132a3c] text-slate-200"
      : "border-slate-200 bg-white text-slate-700 shadow-md";

  return (
    <span ref={rootRef} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`${label} details`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonClass}`}
      >
        i
      </button>
      {open ? (
        <span
          id={panelId}
          role="dialog"
          aria-label={`${label} details`}
          className={`absolute left-1/2 top-[calc(100%+0.35rem)] z-30 -translate-x-1/2 rounded-lg border p-2.5 text-left text-xs font-normal normal-case tracking-normal leading-relaxed ${
            wide ? "w-72 sm:w-80" : "w-56"
          } ${panelClass}`}
        >
          {detail}
        </span>
      ) : null}
    </span>
  );
}
