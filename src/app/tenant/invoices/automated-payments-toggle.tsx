"use client";

import { toggleAutoPay } from "@/app/actions/business";

export function AutomatedPaymentsToggle({ enabled }: { enabled: boolean }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0c1f2e]">
            Automated payments
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Turn this on if you want Harborline to draft payments automatically.
            Your choice is saved until you change it.
          </p>
        </div>
        <form action={toggleAutoPay} className="flex items-center gap-3">
          <input
            type="hidden"
            name="enabled"
            value={enabled ? "false" : "true"}
          />
          <span className="text-sm text-slate-700">
            {enabled ? "On" : "Off"}
          </span>
          <button
            type="submit"
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle automated payments"
            className={`relative h-7 w-12 rounded-full transition ${
              enabled ? "bg-[#0c1f2e]" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </form>
      </div>
    </section>
  );
}
