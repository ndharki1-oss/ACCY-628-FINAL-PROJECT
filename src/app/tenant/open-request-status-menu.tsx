"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cancelTenantRequest } from "@/app/tenant/actions";
import { statusClass } from "@/lib/utils";

export function OpenRequestStatusMenu({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize ${statusClass(status)} ${
          pending ? "opacity-70" : "hover:brightness-95"
        }`}
      >
        {pending ? "Updating…" : status.replaceAll("_", " ")}
        <svg
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 opacity-80"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.25 7.5 10 12.25 14.75 7.5H5.25Z" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <form
            action={(formData) => {
              setOpen(false);
              startTransition(async () => {
                await cancelTenantRequest(formData);
              });
            }}
          >
            <input type="hidden" name="request_id" value={requestId} />
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Cancel request
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
