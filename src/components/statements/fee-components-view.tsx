"use client";

import Link from "next/link";
import { Fragment, useCallback, useMemo, useState } from "react";
import { MetricInfoTip } from "@/components/owner/metric-info-tip";
import { StatementPeriodSelect } from "@/components/statements/statement-period-select";
import { Badge, Card, Stat } from "@/components/ui";
import {
  accountingExportFilename,
  buildAccountingStatementsPdf,
  downloadPdfBytes,
} from "@/lib/statements/build-accounting-statements-pdf";
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
  enablePdfExport = false,
}: {
  rows: FeeStatementRow[];
  periods: string[];
  selectedPeriod: string | null;
  basePath: string;
  /** e.g. `/admin/properties` — omit to show property name without a link */
  propertyHrefPrefix?: string;
  /** Accounting portal only — export filtered statements to PDF */
  enablePdfExport?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
  const feeMixTotal = activeFeeTypes.reduce((sum, key) => sum + totals[key], 0);
  const periodHint = selectedPeriod
    ? formatPeriodLabel(selectedPeriod)
    : "All periods";

  const filterNote = useMemo(() => {
    const parts: string[] = [];
    if (query.trim()) parts.push(`search “${query.trim()}”`);
    if (ownerFilter !== "all") parts.push(`owner ${ownerFilter}`);
    if (propertyFilter !== "all") {
      const name =
        properties.find((p) => p.id === propertyFilter)?.name ?? propertyFilter;
      parts.push(`property ${name}`);
    }
    if (statusFilter !== "all") {
      parts.push(`status ${statusFilter.replaceAll("_", " ")}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [query, ownerFilter, propertyFilter, statusFilter, properties]);

  const exportRows = useCallback(
    async (rowsToExport: FeeStatementRow[]) => {
      if (!enablePdfExport || rowsToExport.length === 0) return;
      setExportError(null);
      setExporting(true);
      try {
        const bytes = await buildAccountingStatementsPdf(rowsToExport, {
          periodLabel: periodHint,
          filterNote:
            rowsToExport.length === filtered.length ? filterNote : null,
        });
        downloadPdfBytes(
          bytes,
          accountingExportFilename(rowsToExport, periodHint)
        );
      } catch (e) {
        setExportError(
          e instanceof Error ? e.message : "Failed to export PDF."
        );
      } finally {
        setExporting(false);
      }
    },
    [enablePdfExport, periodHint, filterNote, filtered.length]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <StatementPeriodSelect
          periods={periods}
          selectedPeriod={selectedPeriod}
          basePath={basePath}
        />
        <div className="flex max-w-xl flex-col items-end gap-2">
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <span>
              Fees reduce remittance. Base fee is a credit-based % of
              collections. Remittance = collections − expenses − fees.
            </span>
            <MetricInfoTip
              label="Fee calculation"
              detail="Agency fee totals come from owner statement fee lines. The base management fee uses each tenant’s credit rating (4–12% of collections), not the property agreement average. Header fee total should match the sum of fee components; mismatches are flagged in the table."
            />
          </p>
          {enablePdfExport ? (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                disabled={exporting || filtered.length === 0}
                onClick={() => void exportRows(filtered)}
                className="rounded border border-[#0c1f2e] bg-[#0c1f2e] px-3 py-1.5 text-xs font-medium text-[#f3efe6] transition hover:bg-[#163247] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting
                  ? "Exporting…"
                  : `Export to PDF (${filtered.length})`}
              </button>
              <p className="text-xs text-slate-500">
                Exports the statements matching the current period and filters.
              </p>
              {exportError ? (
                <p className="text-xs text-rose-700">{exportError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Fee type</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 pl-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {activeFeeTypes.map((t) => {
                  const amount = totals[t];
                  const share =
                    feeMixTotal > 0 ? (amount / feeMixTotal) * 100 : 0;
                  return (
                    <tr key={t} className="border-b border-slate-100">
                      <td className="py-2.5 pr-3 text-[#0c1f2e]">
                        {FEE_LINE_LABELS[t]}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-[#0c1f2e]">
                        {formatMoney(amount)}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-slate-600">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                          <div className="flex flex-wrap gap-1.5">
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
                            {enablePdfExport ? (
                              <button
                                type="button"
                                disabled={exporting}
                                onClick={() => void exportRows([r])}
                                className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] transition hover:border-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                PDF
                              </button>
                            ) : null}
                          </div>
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
