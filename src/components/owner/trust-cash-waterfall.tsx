import { formatMoney } from "@/lib/utils";
import type { TrustCashPosition } from "@/lib/trust-cash";
import {
  formatPeriodLabel,
  periodKey,
} from "@/lib/statements/fee-components";

function Row({
  label,
  value,
  sign,
  emphasize,
}: {
  label: string;
  value: number;
  sign?: "+" | "−" | "=";
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0 ${
        emphasize ? "pt-3" : ""
      }`}
    >
      <span className={emphasize ? "font-medium text-[#0c1f2e]" : "text-slate-600"}>
        {sign ? (
          <span className="mr-2 tabular-nums text-slate-400">{sign}</span>
        ) : null}
        {label}
      </span>
      <span
        className={`tabular-nums ${
          emphasize
            ? "font-[family-name:var(--font-display)] text-lg font-semibold text-[#0c1f2e]"
            : "font-medium text-[#0c1f2e]"
        }`}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}

export function TrustCashWaterfall({
  position,
  title = "Owner funds held by Harborline",
}: {
  position: TrustCashPosition | null;
  title?: string;
}) {
  if (!position) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        No statement activity yet for a trust cash rollforward on this property.
      </div>
    );
  }

  const period = position.periodEnd
    ? formatPeriodLabel(periodKey(position.periodEnd))
    : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[#0c1f2e]">
          {title}
        </h3>
        {period || position.statementNumber ? (
          <p className="text-xs text-slate-500">
            {[position.statementNumber, period].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Custodial cash for this property — rent collected is your liability sitting
        with Harborline, not company revenue. Reserve is a demo operating holdback
        (10% of period remittance before reserve).
      </p>
      <div>
        <Row label="Beginning trust balance" value={position.beginning} />
        <Row label="Collected from tenants" value={position.collected} sign="+" />
        <Row
          label="Paid for owner (property OpEx)"
          value={position.paidForOwner}
          sign="−"
        />
        <Row label="Harborline management fee" value={position.managementFee} sign="−" />
        <Row label="Operating reserve (held)" value={position.reserve} sign="−" />
        <Row label="Due to owner" value={position.dueToOwner} sign="=" emphasize />
      </div>
    </div>
  );
}
