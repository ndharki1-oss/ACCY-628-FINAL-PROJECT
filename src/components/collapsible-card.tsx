"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

export function CollapsibleCard({
  title,
  action,
  children,
  defaultOpen = true,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

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
            onClick={() => setOpen((v) => !v)}
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
