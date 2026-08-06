"use client";

import { useId, useState } from "react";

const approveBtn =
  "rounded bg-emerald-700 px-3 py-2 text-sm text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:translate-y-0 active:scale-[0.98]";
const denyBtn =
  "rounded bg-rose-700 px-3 py-2 text-sm text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-md hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 active:translate-y-0 active:scale-[0.98]";

type OwnerDecisionActionsProps = {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  approveDecision?: string;
  denyDecision: string;
  denyOpenLabel?: string;
  denyConfirmLabel?: string;
  reasonName?: string;
  reasonRequired?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
};

export function OwnerDecisionActions({
  id,
  action,
  approveDecision = "approve",
  denyDecision,
  denyOpenLabel = "Decline…",
  denyConfirmLabel = "Confirm decline",
  reasonName = "reason",
  reasonRequired = true,
  reasonLabel = "Why are you declining?",
  reasonPlaceholder = "Note for Harborline management…",
}: OwnerDecisionActionsProps) {
  const [open, setOpen] = useState(false);
  const fieldId = useId();

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={approveDecision} />
          <button type="submit" className={approveBtn}>
            Approve
          </button>
        </form>
        {!open ? (
          <button
            type="button"
            className={denyBtn}
            onClick={() => setOpen(true)}
          >
            {denyOpenLabel}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 sm:p-4">
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="decision" value={denyDecision} />
            <div>
              <label
                htmlFor={fieldId}
                className="block text-sm font-medium text-[#0c1f2e]"
              >
                {reasonLabel}
                {reasonRequired ? (
                  <span className="text-rose-700"> *</span>
                ) : (
                  <span className="font-normal text-slate-500"> (optional)</span>
                )}
              </label>
              <p className="mt-0.5 text-xs text-slate-500">
                This note goes to Harborline property management.
              </p>
              <textarea
                id={fieldId}
                name={reasonName}
                required={reasonRequired}
                rows={3}
                placeholder={reasonPlaceholder}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] shadow-sm focus:border-[#c4784a] focus:outline-none focus:ring-1 focus:ring-[#c4784a]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={denyBtn}>
                {denyConfirmLabel}
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#0c1f2e]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
