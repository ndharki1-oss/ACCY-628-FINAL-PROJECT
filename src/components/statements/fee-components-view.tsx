"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { MetricInfoTip } from "@/components/owner/metric-info-tip";
import { StatementPeriodSelect } from "@/components/statements/statement-period-select";
import { Badge, Card, Stat } from "@/components/ui";
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

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-2";

function isKnown(t: string): t is FeeLineType {
  return (FEE_LINE_TYPES as readonly string[]).includes(t);
}

function feeSumForRow(row: FeeStatementRow) {
  return FEE_LINE_TYPES.reduce((s, t) => s + row.fees[t], 0);
}

function hasFeeMismatch(row: FeeStatementRow) {
  return Math.abs(feeSumForRow(row) - row.management_fee) > 0.01;
}

function FeeBreakdown({ row }: { row: FeeStatementRow }) {
  if (row.fee_lines.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No agency fee lines on this statement.
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-xs text-slate-600">
      {row.fee_lines.map((l, i) => (
        <li key={`${row.id}-${i}`} className="flex justify-between gap-4">
          <span>
            <span className="font-medium text-slate-700">
              {isKnown(l.line_type) ? FEE_LINE_LABELS[l.line_type] : l.line_type}
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
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const periodRows = useMemo(
    () =>
      selectedPeriod
        ? rows.filter((r) => periodKey(r.period_end) === selectedPeriod)
        : rows,
    [rows, selectedPeriod]
  );

  const owners = useMemo(
    () =>
      [...new Set(periodRows.map((r) => r.owner_name))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [periodRows]
  );

  const properties = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of periodRows) {
      if (ownerFilter !== "all" && row.owner_name !== ownerFilter) continue;
      map.set(row.property_id, row.property_name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [periodRows, ownerFilter]);

  const statuses = useMemo(
    () =>
      [...new Set(periodRows.map((r) => r.status))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [periodRows]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return periodRows.filter((row) => {
      if (ownerFilter !== "all" && row.owner_name !== ownerFilter) return false;
      if (propertyFilter !== "all" && row.property_id !== propertyFilter) {
        return false;
      }
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        row.statement_number,
        row.property_name,
        row.owner_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [periodRows, query, ownerFilter, propertyFilter, statusFilter]);

  const totals = sumFeeTotals(filtered);
  const remittanceTotal = filtered.reduce(
    (s, r) => s + r.remittance_due,
    0
  );
  const collectionsTotal = filtered.reduce(
    (s, r) => s + r.total_collections,
    0
  );
  const expenseTotal = filtered.reduce((s, r) => s + r.total_expenses, 0);
  const mismatchCount = filtered.filter(hasFeeMismatch).length;
  const activeFeeTypes = FEE_LINE_TYPES.filter((t) => totals[t] > 0.009);
  const periodHint = selectedPeriod
    ? formatPeriodLabel(selectedPeriod)
    : "All periods";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <StatementPeriodSelect
          periods={periods}
          selectedPeriod={selectedPeriod}
          basePath={basePath}
        />
        <p className="flex max-w-xl items-start gap-2 text-sm text-slate-600">
          <span>
            Fees reduce remittance. Base fee is a credit-based % of collections.
            Remittance = collections − expenses − fees.
          </span>
          <MetricInfoTip
            label="Fee calculation"
            detail="Agency fee totals come from owner statement fee lines. The base management fee uses each tenant’s credit rating (4–12% of collections), not the property agreement average. Header fee total should match the sum of fee components; mismatches are flagged in the table."
          />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Statements"
          value={String(filtered.length)}
          hint={periodHint}
        />
        <Stat
          label="Agency fee total"
          value={formatMoney(totals.agency_total)}
          hint={periodHint}
        />
        <Stat
          label="Remittance due"
          value={formatMoney(remittanceTotal)}
          hint={`${periodHint} · owed to owners`}
        />
        <Stat
          label="Exceptions"
          value={String(mismatchCount)}
          hint={
            mismatchCount > 0
              ? "Fee lines don’t match statement fee total"
              : "Fee lines match statement headers"
          }
        />
      </div>

      {activeFeeTypes.length > 0 ? (
        <Card
          title="Fee mix"
          action={
            <span className="text-sm text-slate-500">
              Collections {formatMoney(collectionsTotal)} · Expenses{" "}
              {formatMoney(expenseTotal)}
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {activeFeeTypes.map((t) => (
              <div
                key={t}
                className="rounded-md border border-slate-200 bg-white/70 px-3 py-2"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {FEE_LINE_LABELS[t]}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-[#0c1f2e] tabular-nums">
                  {formatMoney(totals[t])}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm md:col-span-2 xl:col-span-1">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Statement, property, or owner"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Owner
          </span>
          <select
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setPropertyFilter("all");
            }}
            className={inputClass}
          >
            <option value="all">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Property
          </span>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} capitalize`}
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Card
        title={
          selectedPeriod
            ? `Remittances · ${formatPeriodLabel(selectedPeriod)}`
            : "Remittances"
        }
        action={
          <span className="text-sm text-slate-500">
            {filtered.length} statement{filtered.length === 1 ? "" : "s"}
          </span>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-600">
            No statements match the current period or filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Statement</th>
                  <th className="py-2 pr-3">Property</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Collections</th>
                  <th className="py-2 pr-3">Expenses</th>
                  <th className="py-2 pr-3">Fee total</th>
                  <th className="py-2 pr-3">Remittance</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const mismatch = hasFeeMismatch(r);
                  const open = expandedId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-[#0c1f2e]">
                            {r.statement_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            {r.period_start} → {r.period_end}
                          </p>
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
                          {formatMoney(r.total_collections)}
                        </td>
                        <td className="py-3 pr-3 tabular-nums">
                          {formatMoney(r.total_expenses)}
                        </td>
                        <td
                          className={`py-3 pr-3 font-medium tabular-nums ${
                            mismatch ? "text-rose-700" : ""
                          }`}
                        >
                          {formatMoney(r.management_fee)}
                          {mismatch ? (
                            <p className="text-xs font-normal">
                              lines {formatMoney(feeSumForRow(r))}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3 font-medium tabular-nums text-[#0c1f2e]">
                          {formatMoney(r.remittance_due)}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge status={r.status} />
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() =>
                              setExpandedId(open ? null : r.id)
                            }
                            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] transition hover:border-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
                          >
                            {open ? "Hide fees" : "Fee mix"}
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-slate-100 bg-[#0c1f2e]/[0.02]">
                          <td colSpan={9} className="px-3 py-4">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                              <div>
                                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                                  Fee components
                                </p>
                                <ul className="space-y-1 text-sm">
                                  {FEE_LINE_TYPES.filter(
                                    (t) => r.fees[t] > 0.009
                                  ).map((t) => (
                                    <li
                                      key={t}
                                      className="flex justify-between gap-4"
                                    >
                                      <span>{FEE_LINE_LABELS[t]}</span>
                                      <span className="tabular-nums">
                                        {formatMoney(r.fees[t])}
                                      </span>
                                    </li>
                                  ))}
                                  {FEE_LINE_TYPES.every(
                                    (t) => r.fees[t] <= 0.009
                                  ) ? (
                                    <li className="text-slate-500">
                                      No fee components recorded.
                                    </li>
                                  ) : null}
                                </ul>
                              </div>
                              <div>
                                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                                  Fee line detail
                                </p>
                                <FeeBreakdown row={r} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
