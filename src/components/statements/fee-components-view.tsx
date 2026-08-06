import Link from "next/link";
import { Badge, Card, Stat } from "@/components/ui";
import { StatementPeriodSelect } from "@/components/statements/statement-period-select";
import { formatMoney } from "@/lib/utils";
import {
  FEE_LINE_LABELS,
  FEE_LINE_TYPES,
  formatPeriodLabel,
  periodKey,
  sumFeeTotals,
  type FeeLineType,
  type FeeStatementRow,
} from "@/lib/statements/fee-components";

function FeeBreakdown({ row }: { row: FeeStatementRow }) {
  if (row.fee_lines.length === 0) {
    return (
      <p className="text-xs text-slate-500">No agency fee lines on this statement.</p>
    );
  }
  return (
    <ul className="space-y-1 text-xs text-slate-600">
      {row.fee_lines.map((l, i) => (
        <li key={`${row.id}-${i}`} className="flex justify-between gap-4">
          <span>
            <span className="font-medium text-slate-700">
              {isKnown(l.line_type)
                ? FEE_LINE_LABELS[l.line_type]
                : l.line_type}
            </span>
            {" · "}
            {l.description}
          </span>
          <span className="shrink-0 tabular-nums">{formatMoney(l.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function isKnown(t: string): t is FeeLineType {
  return (FEE_LINE_TYPES as readonly string[]).includes(t);
}

export function FeeComponentsView({
  rows,
  periods,
  selectedPeriod,
  basePath,
  propertyHrefPrefix,
}: {
  rows: FeeStatementRow[];
  periods: string[];
  selectedPeriod: string | null;
  basePath: string;
  /** e.g. `/admin/properties` — omit to show property name without a link */
  propertyHrefPrefix?: string;
}) {
  const filtered = selectedPeriod
    ? rows.filter((r) => periodKey(r.period_end) === selectedPeriod)
    : rows;
  const totals = sumFeeTotals(filtered);
  const allTotals = sumFeeTotals(rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <StatementPeriodSelect
          periods={periods}
          selectedPeriod={selectedPeriod}
          basePath={basePath}
        />
        <p className="text-sm text-slate-600">
          Base management fee is a <span className="font-medium">tenant
          credit-based</span> % of collections (not the property agreement
          average). Header <span className="font-medium">mgmt fee</span> = sum
          of agency fee components below. Remittance = collections − expenses −
          fee.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {FEE_LINE_TYPES.map((t) => (
          <Stat
            key={t}
            label={FEE_LINE_LABELS[t]}
            value={formatMoney(totals[t])}
            hint={
              selectedPeriod
                ? formatPeriodLabel(selectedPeriod)
                : "All periods"
            }
          />
        ))}
        <Stat
          label="Agency fee total"
          value={formatMoney(totals.agency_total)}
          hint={
            selectedPeriod
              ? `vs all-time ${formatMoney(allTotals.agency_total)}`
              : `${filtered.length} statements`
          }
        />
      </div>

      <Card
        title={
          selectedPeriod
            ? `Statements · ${formatPeriodLabel(selectedPeriod)}`
            : "Statements"
        }
        action={
          <span className="text-sm text-slate-500">
            {filtered.length} statement{filtered.length === 1 ? "" : "s"}
          </span>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-600">No statements for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Statement</th>
                  <th className="py-2 pr-3">Property</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Base</th>
                  <th className="py-2 pr-3">Lease</th>
                  <th className="py-2 pr-3">CM</th>
                  <th className="py-2 pr-3">Renewal</th>
                  <th className="py-2 pr-3">Late</th>
                  <th className="py-2 pr-3">Fee total</th>
                  <th className="py-2">Remittance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const feeSum = FEE_LINE_TYPES.reduce(
                    (s, t) => s + r.fees[t],
                    0
                  );
                  const mismatch =
                    Math.abs(feeSum - r.management_fee) > 0.01;
                  return (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{r.statement_number}</p>
                        <p className="text-xs text-slate-500">
                          {r.period_start} → {r.period_end}
                        </p>
                        <Badge status={r.status} />
                      </td>
                      <td className="py-3 pr-3">
                        {propertyHrefPrefix ? (
                          <Link
                            href={`${propertyHrefPrefix}/${r.property_id}`}
                            className="font-medium text-[#0c1f2e] hover:text-[#c4784a] hover:underline"
                          >
                            {r.property_name}
                          </Link>
                        ) : (
                          r.property_name
                        )}
                      </td>
                      <td className="py-3 pr-3">{r.owner_name}</td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatMoney(r.fees.management_fee)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatMoney(r.fees.leasing_commission)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatMoney(r.fees.project_fee)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatMoney(r.fees.renewal_fee)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatMoney(r.fees.late_fee_retained)}
                      </td>
                      <td
                        className={`py-3 pr-3 font-medium tabular-nums ${
                          mismatch ? "text-rose-700" : ""
                        }`}
                      >
                        {formatMoney(r.management_fee)}
                        {mismatch ? (
                          <p className="text-xs font-normal">
                            lines {formatMoney(feeSum)}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 tabular-nums">
                        {formatMoney(r.remittance_due)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Fee line detail">
        <div className="space-y-5">
          {filtered.map((r) => (
            <div
              key={`detail-${r.id}`}
              className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[#0c1f2e]">
                  {r.statement_number} · {r.property_name}
                </p>
                <p className="text-xs text-slate-500">
                  Collections {formatMoney(r.total_collections)} · Expenses{" "}
                  {formatMoney(r.total_expenses)} · Fee{" "}
                  {formatMoney(r.management_fee)}
                </p>
              </div>
              <FeeBreakdown row={r} />
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-600">Nothing to show.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
