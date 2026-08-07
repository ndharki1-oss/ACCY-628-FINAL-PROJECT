"use client";

import { useMemo, useState } from "react";
import { ExcelExportButton } from "@/components/export/excel-export-button";
import { Card } from "@/components/ui";
import { excelStamp, exportExcelCsv } from "@/lib/export/excel-csv";
import { formatMoney } from "@/lib/utils";
import type {
  LaborRow,
  MaintenanceRow,
  MaintenanceSummaryRow,
} from "@/lib/reports/types";
import {
  SortSelect,
  ValueFilterSelect,
  type SortDirection,
} from "@/components/reports/table-header-controls";

type SummarySortKey =
  | "laborCost"
  | "materialsCost"
  | "vendorCost"
  | "otherCost"
  | "total";

export function MaintenanceSummaryTable({
  rows,
  enableExcelExport = false,
}: {
  rows: MaintenanceSummaryRow[];
  enableExcelExport?: boolean;
}) {
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SummarySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("none");

  const properties = useMemo(
    () =>
      [...new Set(rows.map((r) => r.propertyName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  function setColumnSort(key: SummarySortKey, direction: SortDirection) {
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
      if (propertyFilter !== "all" && row.propertyName !== propertyFilter) {
        return false;
      }
      return true;
    });

    if (!sortKey || sortDir === "none") return filtered;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => (a[sortKey] - b[sortKey]) * factor
    );
  }, [rows, propertyFilter, sortKey, sortDir]);

  return (
    <Card
      title="Maintenance cost by property (summary)"
      action={
        enableExcelExport ? (
          <ExcelExportButton
            count={displayed.length}
            disabled={displayed.length === 0}
            onClick={() =>
              exportExcelCsv({
                filename: `maintenance-summary-${excelStamp()}.csv`,
                headers: [
                  "Property",
                  "Labor",
                  "Materials/Parts",
                  "Vendor/Contractor",
                  "Other",
                  "Total",
                ],
                rows: displayed.map((r) => [
                  r.propertyName,
                  r.laborCost,
                  r.materialsCost,
                  r.vendorCost,
                  r.otherCost,
                  r.total,
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
                <span className="block">Labor</span>
                <SortSelect
                  label="Sort labor"
                  value={sortKey === "laborCost" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("laborCost", dir)}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Materials/Parts</span>
                <SortSelect
                  label="Sort materials"
                  value={sortKey === "materialsCost" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("materialsCost", dir)}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Vendor/Contractor</span>
                <SortSelect
                  label="Sort vendor"
                  value={sortKey === "vendorCost" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("vendorCost", dir)}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Other</span>
                <SortSelect
                  label="Sort other"
                  value={sortKey === "otherCost" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("otherCost", dir)}
                />
              </th>
              <th className="py-2 align-bottom">
                <span className="block">Total</span>
                <SortSelect
                  label="Sort total"
                  value={sortKey === "total" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("total", dir)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-slate-500">
                  No properties match the current filters.
                </td>
              </tr>
            ) : (
              displayed.map((r) => (
                <tr key={r.propertyId} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{r.propertyName}</td>
                  <td className="py-2 pr-2">{formatMoney(r.laborCost)}</td>
                  <td className="py-2 pr-2">{formatMoney(r.materialsCost)}</td>
                  <td className="py-2 pr-2">{formatMoney(r.vendorCost)}</td>
                  <td className="py-2 pr-2">{formatMoney(r.otherCost)}</td>
                  <td className="py-2 font-medium">{formatMoney(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type DetailSortKey = "hours" | "amount";

export function MaintenanceDetailTable({
  rows,
  enableExcelExport = false,
}: {
  rows: MaintenanceRow[];
  enableExcelExport?: boolean;
}) {
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [workOrderFilter, setWorkOrderFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [descriptionFilter, setDescriptionFilter] = useState("all");
  const [sortKey, setSortKey] = useState<DetailSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("none");

  const properties = useMemo(
    () =>
      [...new Set(rows.map((r) => r.propertyName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const workOrders = useMemo(
    () =>
      [...new Set(rows.map((r) => r.workOrderNumber ?? "—"))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const categories = useMemo(
    () =>
      [...new Set(rows.map((r) => r.category))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const descriptions = useMemo(
    () =>
      [
        ...new Set(
          rows.map((r) =>
            r.employeeName ? `${r.description} · ${r.employeeName}` : r.description
          )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  function setColumnSort(key: DetailSortKey, direction: SortDirection) {
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
      if (propertyFilter !== "all" && row.propertyName !== propertyFilter) {
        return false;
      }
      if (
        workOrderFilter !== "all" &&
        (row.workOrderNumber ?? "—") !== workOrderFilter
      ) {
        return false;
      }
      if (categoryFilter !== "all" && row.category !== categoryFilter) {
        return false;
      }
      const descriptionLabel = row.employeeName
        ? `${row.description} · ${row.employeeName}`
        : row.description;
      if (descriptionFilter !== "all" && descriptionLabel !== descriptionFilter) {
        return false;
      }
      return true;
    });

    if (!sortKey || sortDir === "none") return filtered;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const aVal = sortKey === "hours" ? (a.hours ?? -1) : a.amount;
      const bVal = sortKey === "hours" ? (b.hours ?? -1) : b.amount;
      return (aVal - bVal) * factor;
    });
  }, [
    rows,
    propertyFilter,
    workOrderFilter,
    categoryFilter,
    descriptionFilter,
    sortKey,
    sortDir,
  ]);

  return (
    <Card
      title="Maintenance cost detail"
      action={
        enableExcelExport ? (
          <ExcelExportButton
            count={displayed.length}
            disabled={displayed.length === 0}
            onClick={() =>
              exportExcelCsv({
                filename: `maintenance-detail-${excelStamp()}.csv`,
                headers: [
                  "Property",
                  "Work order",
                  "Category",
                  "Description",
                  "Employee",
                  "Hours",
                  "Amount",
                ],
                rows: displayed.map((r) => [
                  r.propertyName,
                  r.workOrderNumber ?? "",
                  r.category,
                  r.description,
                  r.employeeName ?? "",
                  r.hours,
                  r.amount,
                ]),
              })
            }
          />
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
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
                <span className="block">Work order</span>
                <ValueFilterSelect
                  label="Filter by work order"
                  value={workOrderFilter}
                  onChange={setWorkOrderFilter}
                  options={workOrders}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Category</span>
                <ValueFilterSelect
                  label="Filter by category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categories}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Description</span>
                <ValueFilterSelect
                  label="Filter by description"
                  value={descriptionFilter}
                  onChange={setDescriptionFilter}
                  options={descriptions}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Hours</span>
                <SortSelect
                  label="Sort hours"
                  value={sortKey === "hours" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("hours", dir)}
                />
              </th>
              <th className="py-2 align-bottom">
                <span className="block">Amount</span>
                <SortSelect
                  label="Sort amount"
                  value={sortKey === "amount" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("amount", dir)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-slate-500">
                  No rows match the current filters.
                </td>
              </tr>
            ) : (
              displayed.map((r, idx) => (
                <tr
                  key={`${r.propertyId}-${r.category}-${idx}`}
                  className="border-b border-slate-100"
                >
                  <td className="py-2 pr-2">{r.propertyName}</td>
                  <td className="py-2 pr-2">{r.workOrderNumber ?? "—"}</td>
                  <td className="py-2 pr-2 capitalize">{r.category}</td>
                  <td className="py-2 pr-2">
                    {r.description}
                    {r.employeeName ? ` · ${r.employeeName}` : ""}
                  </td>
                  <td className="py-2 pr-2">
                    {r.hours != null ? r.hours.toFixed(1) : "—"}
                  </td>
                  <td className="py-2">{formatMoney(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type LaborSortKey = "workDate" | "hours" | "hourlyRate" | "laborCost";

export function LaborTable({
  rows,
  enableExcelExport = false,
}: {
  rows: LaborRow[];
  enableExcelExport?: boolean;
}) {
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [sortKey, setSortKey] = useState<LaborSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("none");

  const employees = useMemo(
    () =>
      [...new Set(rows.map((r) => r.employeeName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const properties = useMemo(
    () =>
      [...new Set(rows.map((r) => r.propertyName))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  function setColumnSort(key: LaborSortKey, direction: SortDirection) {
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
      if (employeeFilter !== "all" && row.employeeName !== employeeFilter) {
        return false;
      }
      if (propertyFilter !== "all" && row.propertyName !== propertyFilter) {
        return false;
      }
      return true;
    });

    if (!sortKey || sortDir === "none") return filtered;

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "workDate") {
        return a.workDate.localeCompare(b.workDate) * factor;
      }
      return (a[sortKey] - b[sortKey]) * factor;
    });
  }, [rows, employeeFilter, propertyFilter, sortKey, sortDir]);

  return (
    <Card
      title="Employee labor"
      action={
        enableExcelExport ? (
          <ExcelExportButton
            count={displayed.length}
            disabled={displayed.length === 0}
            onClick={() =>
              exportExcelCsv({
                filename: `employee-labor-${excelStamp()}.csv`,
                headers: [
                  "Employee",
                  "Date",
                  "Property",
                  "Work order",
                  "Hours",
                  "Rate",
                  "Cost",
                ],
                rows: displayed.map((r) => [
                  r.employeeName,
                  r.workDate,
                  r.propertyName,
                  r.workOrderNumber ?? "",
                  r.hours,
                  r.hourlyRate,
                  r.laborCost,
                ]),
              })
            }
          />
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Employee</span>
                <ValueFilterSelect
                  label="Filter by employee"
                  value={employeeFilter}
                  onChange={setEmployeeFilter}
                  options={employees}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Date</span>
                <SortSelect
                  label="Sort date"
                  value={sortKey === "workDate" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("workDate", dir)}
                />
              </th>
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
                <span className="block">Work order</span>
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Hours</span>
                <SortSelect
                  label="Sort hours"
                  value={sortKey === "hours" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("hours", dir)}
                />
              </th>
              <th className="py-2 pr-2 align-bottom">
                <span className="block">Rate</span>
                <SortSelect
                  label="Sort rate"
                  value={sortKey === "hourlyRate" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("hourlyRate", dir)}
                />
              </th>
              <th className="py-2 align-bottom">
                <span className="block">Cost</span>
                <SortSelect
                  label="Sort cost"
                  value={sortKey === "laborCost" ? sortDir : "none"}
                  onChange={(dir) => setColumnSort("laborCost", dir)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-slate-500">
                  No labor on open / in-progress or completed staff work orders.
                </td>
              </tr>
            ) : (
              displayed.map((r) => (
                <tr key={r.entryId} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{r.employeeName}</td>
                  <td className="py-2 pr-2">{r.workDate}</td>
                  <td className="py-2 pr-2">{r.propertyName}</td>
                  <td className="py-2 pr-2">{r.workOrderNumber ?? "—"}</td>
                  <td className="py-2 pr-2">{r.hours.toFixed(1)}</td>
                  <td className="py-2 pr-2">{formatMoney(r.hourlyRate)}</td>
                  <td className="py-2">{formatMoney(r.laborCost)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
