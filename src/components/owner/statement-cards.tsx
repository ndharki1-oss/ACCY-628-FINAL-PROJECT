"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { PropertyLink } from "@/components/property-link";
import { TrustCashWaterfall } from "@/components/owner/trust-cash-waterfall";
import { computeTrustCashPosition } from "@/lib/trust-cash";
import { formatMoney } from "@/lib/utils";

export type OwnerStatementLine = {
  line_type: string;
  description: string;
  amount: number;
};

export type OwnerStatementCardData = {
  id: string;
  property_id: string;
  statement_number: string;
  period_start: string;
  period_end: string;
  status: string;
  total_collections: number | string;
  total_expenses: number | string;
  management_fee: number | string;
  remittance_due: number | string;
  propertyName: string | null;
  projectFee: number;
  /** Base management fee only (excludes project/other agency fees in the header total). */
  baseManagementFee: number;
  lines: OwnerStatementLine[];
  beginningBalance?: number;
};

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-[#0c1f2e] sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function DetailTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "collect" | "expense" | "project" | "fee" | "remit";
}) {
  const tones = {
    collect: {
      wrap: "border-emerald-200/80 bg-emerald-50/80",
      label: "text-emerald-800/75",
      value: "text-emerald-950",
    },
    expense: {
      wrap: "border-amber-200/80 bg-amber-50/80",
      label: "text-amber-900/75",
      value: "text-amber-950",
    },
    project: {
      wrap: "border-sky-200/80 bg-sky-50/80",
      label: "text-sky-900/75",
      value: "text-sky-950",
    },
    fee: {
      wrap: "border-[#e3c4ad] bg-[#f7eee6]",
      label: "text-[#8a5a3a]",
      value: "text-[#6b3f28]",
    },
    remit: {
      wrap: "border-[#0c1f2e]/15 bg-[#0c1f2e]",
      label: "text-slate-300",
      value: "text-[#f3efe6]",
    },
  }[tone];

  return (
    <div className={`rounded-lg border px-3.5 py-3.5 ${tones.wrap}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tones.label}`}>
        {label}
      </p>
      <p
        className={`mt-1.5 font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight sm:text-2xl ${tones.value}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatementCard({ statement: s }: { statement: OwnerStatementCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-slate-800/10 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {s.propertyName ? (
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[#0c1f2e] sm:text-[1.75rem]">
              <PropertyLink
                id={s.property_id}
                className="transition hover:text-[#c4784a]"
              >
                {s.propertyName}
              </PropertyLink>
            </h2>
          ) : (
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0c1f2e]">
              Statement
            </h2>
          )}
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
            <span className="font-mono text-[11px] text-slate-400">
              {s.statement_number}
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            {s.period_start} to {s.period_end}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={s.status} />
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-[#0c1f2e] shadow-sm transition hover:border-[#c4784a]/50 hover:bg-[#f7eee6] hover:text-[#6b3f28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4784a]"
          >
            {open ? "Hide details" : "Details"}
          </button>
          <a
            href={`/owner/statements/template/${s.id}?download=1`}
            title="Download PDF"
            aria-label={`Download PDF for ${s.statement_number}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-[#0c1f2e] shadow-sm transition hover:border-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c1f2e]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M12 3v12" />
              <path d="m7 11 5 5 5-5" />
              <path d="M5 19h14" />
            </svg>
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          label="Collections"
          value={formatMoney(s.total_collections)}
        />
        <SummaryStat
          label="Expenses"
          value={formatMoney(Math.abs(Number(s.total_expenses)))}
        />
        <SummaryStat
          label="Mgmt fee"
          value={formatMoney(Math.abs(Number(s.management_fee)))}
        />
        <SummaryStat
          label="Remittance"
          value={formatMoney(s.remittance_due)}
        />
      </div>

      {open ? (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <TrustCashWaterfall
            position={computeTrustCashPosition({
              beginning: Number(s.beginningBalance) || 0,
              collections: Number(s.total_collections),
              ownerExpenses: Number(s.total_expenses),
              managementFee: Number(s.management_fee),
              periodStart: s.period_start,
              periodEnd: s.period_end,
              statementNumber: s.statement_number,
            })}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Statement breakdown
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <DetailTile
              label="Collections"
              value={formatMoney(s.total_collections)}
              tone="collect"
            />
            <DetailTile
              label="Expenses"
              value={formatMoney(Math.abs(Number(s.total_expenses)))}
              tone="expense"
            />
            <DetailTile
              label="Project fee"
              value={formatMoney(s.projectFee)}
              tone="project"
            />
            <DetailTile
              label="Management fee"
              value={formatMoney(s.baseManagementFee)}
              tone="fee"
            />
            <DetailTile
              label="Remittance"
              value={formatMoney(s.remittance_due)}
              tone="remit"
            />
          </div>
          {s.lines.length > 0 ? (
            <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
              {s.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>
                    <span className="font-medium capitalize text-slate-700">
                      {l.line_type.replaceAll("_", " ")}
                    </span>
                    {l.description ? (
                      <span className="text-slate-500"> · {l.description}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#0c1f2e]">
                    {formatMoney(l.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function OwnerStatementCards({
  statements,
  emptyMessage = "No statements have been issued yet.",
}: {
  statements: OwnerStatementCardData[];
  emptyMessage?: string;
}) {
  if (statements.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-4">
      {statements.map((s) => (
        <StatementCard key={s.id} statement={s} />
      ))}
    </div>
  );
}
