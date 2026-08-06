"use client";

import { useMemo, useState } from "react";
import { StatementPeriodSelect } from "@/components/statements/statement-period-select";
import { Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { formatPeriodLabel } from "@/lib/statements/fee-components";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export type MgmtPnlPropertyRow = {
  id: string;
  name: string;
  owner: string | null | undefined;
  revenue: number;
  expense: number;
  noi: number;
};

export type MgmtPnlOwnerRow = {
  name: string;
  revenue: number;
  expense: number;
};

const headerFilterClass =
  "mt-1 w-full max-w-[9.5rem] rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-normal normal-case tracking-normal text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-1";

type SortDirection = "none" | "asc" | "desc";

function SortSelect({
  value,
  onChange,
  label,
}: {
  value: SortDirection;
  onChange: (value: SortDirection) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as SortDirection)}
      className={headerFilterClass}
    >
      <option value="none">Sort</option>
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>
  );
}

function CollapsibleCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card
      title={title}
      action={
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] transition hover:border-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
        >
          <span aria-hidden className={`transition ${open ? "rotate-90" : ""}`}>
            ›
          </span>
          {open ? "Collapse" : "Expand"}
        </button>
      }
    >
      {open ? (
        children
      ) : (
        <p className="text-sm text-slate-500">Section collapsed.</p>
      )}
    </Card>
  );
}

type PropertySortKey = "revenue" | "expense" | "noi";

function PropertyNoiTable({ rows }: { rows: MgmtPnlPropertyRow[] }) {
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
    return [...filtered].sort(
      (a, b) => (a[sortKey] - b[sortKey]) * factor
    );
  }, [rows, propertyFilter, ownerFilter, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-2 align-bottom">
              <span className="block">Property</span>
              <select
                aria-label="Filter by property"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className={headerFilterClass}
              >
                <option value="all">All</option>
                {properties.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </th>
            <th className="py-2 pr-2 align-bottom">
              <span className="block">Owner</span>
              <select
                aria-label="Filter by owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className={headerFilterClass}
              >
                <option value="all">All</option>
                {owners.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
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
  );
}

function OwnerNoiTable({ rows }: { rows: MgmtPnlOwnerRow[] }) {
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [noiSort, setNoiSort] = useState<SortDirection>("none");

  const owners = useMemo(
    () => [...new Set(rows.map((r) => r.name))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const displayed = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (ownerFilter !== "all" && row.name !== ownerFilter) return false;
      return true;
    });

    if (noiSort === "none") return filtered;

    const factor = noiSort === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const aNoi = a.revenue - a.expense;
      const bNoi = b.revenue - b.expense;
      return (aNoi - bNoi) * factor;
    });
  }, [rows, ownerFilter, noiSort]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-2 align-bottom">
              <span className="block">Owner</span>
              <select
                aria-label="Filter by owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className={headerFilterClass}
              >
                <option value="all">All</option>
                {owners.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </th>
            <th className="py-2 align-bottom">
              <span className="block">NOI</span>
              <SortSelect
                label="Sort owner NOI"
                value={noiSort}
                onChange={setNoiSort}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {displayed.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-6 text-slate-500">
                No owners match the current filters.
              </td>
            </tr>
          ) : (
            displayed.map((o) => {
              const noi = o.revenue - o.expense;
              return (
                <tr key={o.name} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{o.name}</td>
                  <td
                    className={`py-2 font-medium ${
                      noi < 0 ? "text-rose-700" : ""
                    }`}
                  >
                    {formatMoney(noi)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MgmtPnlView({
  periods,
  selectedPeriod,
  basePath,
  feeRevenue,
  companyCosts,
  byProperty,
  byOwner,
}: {
  periods: string[];
  selectedPeriod: string | null;
  basePath: string;
  feeRevenue: number;
  companyCosts: number;
  byProperty: MgmtPnlPropertyRow[];
  byOwner: MgmtPnlOwnerRow[];
}) {
  const periodLabel = selectedPeriod
    ? formatPeriodLabel(selectedPeriod)
    : ALL_PERIODS_HINT;
  const weak = byProperty.filter((p) => p.noi < 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Profitability
          </h1>
          <p className="mt-1 text-sm text-slate-600">{periodLabel}</p>
        </div>
        <StatementPeriodSelect
          periods={periods}
          selectedPeriod={selectedPeriod}
          basePath={basePath}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Company fee revenue"
          value={formatMoney(feeRevenue)}
          hint={`${periodLabel} · GL 4000 = credit-based base management fees on collections`}
        />
        <Stat
          label="Company operating costs"
          value={formatMoney(companyCosts)}
          hint={`${periodLabel} · Harborline company_expenses (not owner property OpEx)`}
        />
        <Stat
          label="Company contribution"
          value={formatMoney(feeRevenue - companyCosts)}
          hint={`${periodLabel} · Fees − Harborline OpEx (not property NOI)`}
        />
      </div>

      {weak.length > 0 ? (
        <Card title={`Alerts: unprofitable / weak NOI properties · ${periodLabel}`}>
          <ul className="space-y-1 text-sm text-rose-800">
            {weak.map((p) => (
              <li key={p.id}>
                {p.name}: NOI {formatMoney(p.noi)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <CollapsibleCard title={`NOI by property · ${periodLabel}`}>
        {byProperty.length === 0 ? (
          <p className="text-sm text-slate-500">
            No property activity for this period.
          </p>
        ) : (
          <PropertyNoiTable rows={byProperty} />
        )}
      </CollapsibleCard>

      <CollapsibleCard title={`By owner · ${periodLabel}`}>
        {byOwner.length === 0 ? (
          <p className="text-sm text-slate-500">
            No owner activity for this period.
          </p>
        ) : (
          <OwnerNoiTable rows={byOwner} />
        )}
      </CollapsibleCard>
    </div>
  );
}
