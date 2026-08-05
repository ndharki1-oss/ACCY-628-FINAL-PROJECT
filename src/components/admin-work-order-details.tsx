"use client";

import { useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { Priority } from "@/lib/work-order-routing";

export type AdminWorkOrderDetail = {
  id: string;
  woNumber: string;
  title: string;
  description: string | null;
  propertyName: string;
  tenantOrSuite: string | null;
  priority: Priority;
  estimatedCost: number;
  displayAmount: number;
  submittedAt: string;
  requestedBy: string;
  vendorName: string | null;
  status: string;
  managementReviewRequired: boolean;
  reviewReasons: string[];
  routingLabel: string;
};

const priorityStyles: Record<Priority, string> = {
  Emergency: "bg-rose-100 text-rose-800",
  High: "bg-amber-100 text-amber-900",
  Medium: "bg-sky-100 text-sky-800",
  Low: "bg-slate-100 text-slate-700",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-[#0c1f2e]">{value}</dd>
    </div>
  );
}

export function WorkOrderDetailsButton({
  detail,
}: {
  detail: AdminWorkOrderDetail;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
      >
        View Details
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0c1f2e]/55 p-4 sm:p-8">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 mt-6 w-full max-w-xl rounded-lg border border-slate-800/10 bg-[#f4f1ea] shadow-xl"
          >
            <header className="flex items-start justify-between gap-4 rounded-t-lg bg-[#0c1f2e] px-5 py-4 text-[#f3efe6]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
                  Work order details
                </p>
                <h3 id={titleId} className="font-[family-name:var(--font-display)] text-xl">
                  {detail.woNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
              >
                Close
              </button>
            </header>

            <div className="space-y-4 px-5 py-5">
              {detail.managementReviewRequired ? (
                <div className="rounded-md border border-rose-800/20 bg-rose-50 px-4 py-3">
                  <p className="inline-flex rounded-full bg-rose-700 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                    Immediate Management Attention Required
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-900">
                    {detail.reviewReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  detail.managementReviewRequired
                    ? "bg-[#0c1f2e] text-[#f3efe6]"
                    : "bg-white text-[#0c1f2e] ring-1 ring-slate-200"
                }`}
              >
                Routing status: {detail.routingLabel}
              </p>

              <dl>
                <DetailRow label="Work-order number" value={detail.woNumber} />
                <DetailRow label="Property" value={detail.propertyName} />
                <DetailRow
                  label="Tenant or suite"
                  value={detail.tenantOrSuite ?? "Not recorded"}
                />
                <DetailRow
                  label="Issue description"
                  value={detail.description || detail.title || "Not recorded"}
                />
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Priority
                  </dt>
                  <dd>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyles[detail.priority]}`}
                    >
                      {detail.priority}
                    </span>
                  </dd>
                </div>
                <DetailRow
                  label="Estimated cost"
                  value={formatMoney(detail.estimatedCost)}
                />
                <DetailRow label="Date submitted" value={detail.submittedAt} />
                <DetailRow label="Requested by" value={detail.requestedBy} />
                <DetailRow
                  label="Assigned worker or vendor"
                  value={detail.vendorName ?? "Unassigned"}
                />
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Approval status
                  </dt>
                  <dd>
                    <Badge status={detail.status} />
                  </dd>
                </div>
                <DetailRow
                  label="Management review required"
                  value={detail.managementReviewRequired ? "Yes" : "No"}
                />
                <DetailRow
                  label="Review reason"
                  value={
                    detail.reviewReasons.length
                      ? detail.reviewReasons.join("; ")
                      : "Routine maintenance below the approval threshold"
                  }
                />
              </dl>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
