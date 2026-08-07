"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

export function CollapsibleCard({
  title,
  action,
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  useEffect(() => {
    if (!isControlled && defaultOpen) setUncontrolledOpen(true);
  }, [defaultOpen, isControlled]);

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Card
      id={id}
      title={title}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {action}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] transition hover:border-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
          >
            <span aria-hidden className={`transition ${open ? "rotate-90" : ""}`}>
              ›
            </span>
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      }
    >
      {open ? (
        children
      ) : (
        <p className="text-sm text-slate-500">Section collapsed.</p>
      )}
    </Card>
  );
}
