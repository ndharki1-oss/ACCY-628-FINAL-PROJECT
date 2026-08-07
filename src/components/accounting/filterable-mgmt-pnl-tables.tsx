"use client";

import { useMemo, useState } from "react";
import { ExcelExportButton } from "@/components/export/excel-export-button";
import { Card } from "@/components/ui";
import { excelStamp, exportExcelCsv } from "@/lib/export/excel-csv";
import { formatMoney } from "@/lib/utils";
import {
  SortSelect,
  ValueFilterSelect,
  type SortDirection,
} from "@/components/reports/table-header-controls";

export type AccountingNoiPropertyRow = {
  id: string;
  name: string;
  owner: string | null | undefined;
  revenue: number;
  expense: number;
  noi: number;
};

type PropertySortKey = "revenue" | "expense" | "noi";

export function AccountingNoiByPropertyTable({
  rows,
  title,
  enableExcelExport = false,
}: {
  rows: AccountingNoiPropertyRow[];
  title: string;
  enableExcelExport?: boolean;
}) {
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<PropertySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("none");

  const properties = useMemo(
    () =>
      [...new Set(rows.map((r) => r.name))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const owners = useMemo(
    () =>
      [...new Set(rows.map((r) => r.owner ?? "Unknown"))].sort((a, b) =>
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

  const displayed = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (propertyFilter !== "all" && row.name !== propertyFilter) return false;
      if (ownerFilter !== "all" && (row.owner ?? "Unknown") !== ownerFilter) {
        return false;
      }
      return true;
    });

    if (!sortKey || sortDir === "none") return filtered;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (a[sortKey] - b[sortKey]) * factor);
  }, [rows, propertyFilter, ownerFilter, sortKey, sortDir]);

  return (
    <Card
      title={title}
      action={
        enableExcelExport ? (
          <ExcelExportButton
            count={displayed.length}
            disabled={displayed.length === 0}
            onClick={() =>
              exportExcelCsv({
                filename: `mgmt-pnl-by-property-${excelStamp()}.csv`,
                headers: ["Property", "Owner", "Tenant charges", "OpEx", "NOI"],
                rows: displayed.map((p) => [
                  p.name,
                  p.owner ?? "Unknown",
                  p.revenue,
                  p.expense,
                  p.noi,
                ]),
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
                <span className="block">Tenant charges</span>
                <SortSelect
                  label="Sort tenant charges"
                  value={sortKey === "revenue" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("revenue", dir)}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">OpEx</span>
                <SortSelect
                  label="Sort OpEx"
                  value={sortKey === "expense" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("expense", dir)}
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
                  No properties match the current filters.
                </td>
              </tr>
            ) : (
              displayed.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{p.name}</td>
                  <td className="py-2 pr-2">{p.owner ?? "Unknown"}</td>
                  <td className="py-2 pr-2">{formatMoney(p.revenue)}</td>
                  <td className="py-2 pr-2">{formatMoney(p.expense)}</td>
                  <td
                    className={`py-2 font-medium ${
                      p.noi < 0 ? "text-rose-700" : ""
                    }`}
                  >
                    {formatMoney(p.noi)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

