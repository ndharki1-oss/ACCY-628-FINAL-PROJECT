"use client";

import { useMemo, useState } from "react";
import { ExcelExportButton } from "@/components/export/excel-export-button";
import { OwnerNoiBarChart } from "@/components/reports/owner-noi-bar-chart";
import { PropertyNoiBarChart } from "@/components/reports/property-noi-bar-chart";
import { Card } from "@/components/ui";
import { excelStamp, exportExcelCsv } from "@/lib/export/excel-csv";
import { formatMoney } from "@/lib/utils";
import type { PropertyPnLChartActivity } from "@/lib/reports/property-pnl-chart";
import type {
  OwnerProfitRow,
  PropertyPnLRow,
  ReportMode,
} from "@/lib/reports/types";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";
import {
  SortSelect,
  ValueFilterSelect,
  type SortDirection,
} from "@/components/reports/table-header-controls";

type PropertySortKey = "revenue" | "expenses" | "laborCost" | "noi";

export function PropertyPnLTable({
  rows,
  mode,
  showChart = false,
  chartActivity = [],
  enableExcelExport = false,
}: {
  rows: PropertyPnLRow[];
  mode: ReportMode;
  showChart?: boolean;
  /** Dated activity for Admin interactive chart only; does not filter the table. */
  chartActivity?: PropertyPnLChartActivity[];
  /** Accounting portal only — export currently visible rows. */
  enableExcelExport?: boolean;
}) {
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<PropertySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("none");

  const properties = useMemo(
    () =>
      [...new Set(rows.map((r) => r.propertyName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const owners = useMemo(
    () =>
      [...new Set(rows.map((r) => r.ownerName || "Unknown"))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  function setColumnSort(key: PropertySortKey, direction: SortDirection) {
    if (direction === "none") {
      setSortKey(null);
      setSortDir("none");
      return;
    }
    setSortKey(key);
    setSortDir(direction);
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (propertyFilter !== "all" && row.propertyName !== propertyFilter) {
        return false;
      }
      if (
        mode === "full" &&
        ownerFilter !== "all" &&
        (row.ownerName || "Unknown") !== ownerFilter
      ) {
        return false;
      }
      return true;
    });
  }, [rows, propertyFilter, ownerFilter, mode]);

  const displayed = useMemo(() => {
    if (!sortKey || sortDir === "none") return filtered;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => (a[sortKey] - b[sortKey]) * factor
    );
  }, [filtered, sortKey, sortDir]);

  const colSpan = mode === "full" ? 6 : 4;

  return (
    <div className="space-y-4">
      {showChart ? (
        <PropertyNoiBarChart
          activity={chartActivity}
          owners={owners}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
        />
      ) : null}
      <Card
        title={
          mode === "summary"
            ? `Property P&L (summary) · ${ALL_PERIODS_HINT}`
            : `Property Profit & Loss · ${ALL_PERIODS_HINT}`
        }
        action={
          enableExcelExport ? (
            <ExcelExportButton
              count={displayed.length}
              disabled={displayed.length === 0}
              onClick={() =>
                exportExcelCsv({
                  filename: `property-pnl-${excelStamp()}.csv`,
                  headers:
                    mode === "full"
                      ? [
                          "Property",
                          "Owner",
                          "Revenue",
                          "OpEx (in NOI)",
                          "Harborline labor (not in NOI)",
                          "NOI",
                        ]
                      : ["Property", "Revenue", "OpEx (in NOI)", "NOI"],
                  rows: displayed.map((r) =>
                    mode === "full"
                      ? [
                          r.propertyName,
                          r.ownerName,
                          r.revenue,
                          r.expenses,
                          r.laborCost,
                          r.noi,
                        ]
                      : [r.propertyName, r.revenue, r.expenses, r.noi]
                  ),
                })
              }
            />
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">Property</span>
                  <ValueFilterSelect
                    label="Filter by property"
                    value={propertyFilter}
                    onChange={setPropertyFilter}
                    options={properties}
                  />
                </th>
                {mode === "full" ? (
                  <th className="py-2 pr-2 align-bottom">
                    <span className="block">Owner</span>
                    <ValueFilterSelect
                      label="Filter by owner"
                      value={ownerFilter}
                      onChange={setOwnerFilter}
                      options={owners}
                    />
                  </th>
                ) : null}
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">Revenue</span>
                  <SortSelect
                    label="Sort revenue"
                    value={sortKey === "revenue" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("revenue", dir)}
                  />
                </th>
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">OpEx (in NOI)</span>
                  <SortSelect
                    label="Sort OpEx"
                    value={sortKey === "expenses" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("expenses", dir)}
                  />
                </th>
                {mode === "full" ? (
                  <th className="py-2 pr-2 align-bottom">
                    <span className="block">Harborline labor — not in NOI</span>
                    <SortSelect
                      label="Sort Harborline labor"
                      value={sortKey === "laborCost" ? sortDir : "none"}
                      onChange={(dir) => setColumnSort("laborCost", dir)}
                    />
                  </th>
                ) : null}
                <th className="py-2 align-bottom">
                  <span className="block">NOI</span>
                  <SortSelect
                    label="Sort NOI"
                    value={sortKey === "noi" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("noi", dir)}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="py-6 text-slate-500">
                    No properties match the current filters.
                  </td>
                </tr>
              ) : (
                displayed.map((r) => (
                  <tr key={r.propertyId} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{r.propertyName}</td>
                    {mode === "full" ? (
                      <td className="py-2 pr-2">{r.ownerName}</td>
                    ) : null}
                    <td className="py-2 pr-2">{formatMoney(r.revenue)}</td>
                    <td className="py-2 pr-2">{formatMoney(r.expenses)}</td>
                    {mode === "full" ? (
                      <td className="py-2 pr-2">{formatMoney(r.laborCost)}</td>
                    ) : null}
                    <td
                      className={`py-2 font-medium ${
                        r.noi < 0 ? "text-rose-700" : ""
                      }`}
                    >
                      {formatMoney(r.noi)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

type OwnerSortKey = "propertyCount" | "revenue" | "expenses" | "noi";

export function OwnerProfitTable({
  rows,
  showChart = false,
  chartActivity = [],
  enableExcelExport = false,
}: {
  rows: OwnerProfitRow[];
  showChart?: boolean;
  /** Dated activity for Admin interactive chart only; does not filter the table. */
  chartActivity?: PropertyPnLChartActivity[];
  /** Accounting portal only — export currently visible rows. */
  enableExcelExport?: boolean;
}) {
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<OwnerSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("none");

  const owners = useMemo(
    () =>
      [...new Set(rows.map((r) => r.ownerName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  function setColumnSort(key: OwnerSortKey, direction: SortDirection) {
    if (direction === "none") {
      setSortKey(null);
      setSortDir("none");
      return;
    }
    setSortKey(key);
    setSortDir(direction);
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (ownerFilter !== "all" && row.ownerName !== ownerFilter) return false;
      return true;
    });
  }, [rows, ownerFilter]);

  const displayed = useMemo(() => {
    if (!sortKey || sortDir === "none") return filtered;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => (a[sortKey] - b[sortKey]) * factor
    );
  }, [filtered, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {showChart ? (
        <OwnerNoiBarChart
          activity={chartActivity}
          owners={owners}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={setOwnerFilter}
        />
      ) : null}
      <Card
        title={`Owner (Customer) Profitability · ${ALL_PERIODS_HINT}`}
        action={
          enableExcelExport ? (
            <ExcelExportButton
              count={displayed.length}
              disabled={displayed.length === 0}
              onClick={() =>
                exportExcelCsv({
                  filename: `owner-profitability-${excelStamp()}.csv`,
                  headers: [
                    "Owner",
                    "Properties",
                    "Revenue",
                    "OpEx (in NOI)",
                    "NOI",
                  ],
                  rows: displayed.map((r) => [
                    r.ownerName,
                    r.propertyCount,
                    r.revenue,
                    r.expenses,
                    r.noi,
                  ]),
                })
              }
            />
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">Owner</span>
                  <ValueFilterSelect
                    label="Filter by owner"
                    value={ownerFilter}
                    onChange={setOwnerFilter}
                    options={owners}
                  />
                </th>
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">Properties</span>
                  <SortSelect
                    label="Sort property count"
                    value={sortKey === "propertyCount" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("propertyCount", dir)}
                  />
                </th>
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">Revenue</span>
                  <SortSelect
                    label="Sort revenue"
                    value={sortKey === "revenue" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("revenue", dir)}
                  />
                </th>
                <th className="py-2 pr-2 align-bottom">
                  <span className="block">OpEx (in NOI)</span>
                  <SortSelect
                    label="Sort OpEx"
                    value={sortKey === "expenses" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("expenses", dir)}
                  />
                </th>
                <th className="py-2 align-bottom">
                  <span className="block">NOI</span>
                  <SortSelect
                    label="Sort NOI"
                    value={sortKey === "noi" ? sortDir : "none"}
                    onChange={(dir) => setColumnSort("noi", dir)}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-slate-500">
                    No owners match the current filters.
                  </td>
                </tr>
              ) : (
                displayed.map((r) => (
                  <tr key={r.ownerId} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{r.ownerName}</td>
                    <td className="py-2 pr-2">{r.propertyCount}</td>
                    <td className="py-2 pr-2">{formatMoney(r.revenue)}</td>
                    <td className="py-2 pr-2">{formatMoney(r.expenses)}</td>
                    <td
                      className={`py-2 font-medium ${
                        r.noi < 0 ? "text-rose-700" : ""
                      }`}
                    >
                      {formatMoney(r.noi)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
