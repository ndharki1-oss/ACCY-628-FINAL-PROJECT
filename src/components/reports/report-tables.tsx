import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type {
  ExpenseBreakdownRow,
  LaborRow,
  MaintenanceRow,
  MaintenanceSummaryRow,
  OwnerProfitRow,
  PropertyPnLRow,
  ReportMode,
} from "@/lib/reports/types";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export function PropertyPnLTable({
  rows,
  mode,
}: {
  rows: PropertyPnLRow[];
  mode: ReportMode;
}) {
  return (
    <Card title={mode === "summary" ? `Property P&L (summary) · ${ALL_PERIODS_HINT}` : `Property Profit & Loss · ${ALL_PERIODS_HINT}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Property</th>
              {mode === "full" ? <th className="py-2">Owner</th> : null}
              <th className="py-2">Revenue</th>
              <th className="py-2">OpEx (in NOI)</th>
              {mode === "full" ? (
                <th className="py-2">Harborline labor — not in NOI</th>
              ) : null}
              <th className="py-2">NOI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.propertyId} className="border-b border-slate-100">
                <td className="py-2">{r.propertyName}</td>
                {mode === "full" ? <td className="py-2">{r.ownerName}</td> : null}
                <td className="py-2">{formatMoney(r.revenue)}</td>
                <td className="py-2">{formatMoney(r.expenses)}</td>
                {mode === "full" ? (
                  <td className="py-2">{formatMoney(r.laborCost)}</td>
                ) : null}
                <td
                  className={`py-2 font-medium ${r.noi < 0 ? "text-rose-700" : ""}`}
                >
                  {formatMoney(r.noi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function OwnerProfitTable({ rows }: { rows: OwnerProfitRow[] }) {
  return (
    <Card title={`Owner (Customer) Profitability · ${ALL_PERIODS_HINT}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Owner</th>
              <th className="py-2">Properties</th>
              <th className="py-2">Revenue</th>
              <th className="py-2">OpEx (in NOI)</th>
              <th className="py-2">NOI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ownerId} className="border-b border-slate-100">
                <td className="py-2">{r.ownerName}</td>
                <td className="py-2">{r.propertyCount}</td>
                <td className="py-2">{formatMoney(r.revenue)}</td>
                <td className="py-2">{formatMoney(r.expenses)}</td>
                <td
                  className={`py-2 font-medium ${r.noi < 0 ? "text-rose-700" : ""}`}
                >
                  {formatMoney(r.noi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function MaintenanceSummaryTable({
  rows,
}: {
  rows: MaintenanceSummaryRow[];
}) {
  return (
    <Card title="Maintenance cost by property (summary)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Property</th>
              <th className="py-2">Labor</th>
              <th className="py-2">Materials/Parts</th>
              <th className="py-2">Vendor/Contractor</th>
              <th className="py-2">Other</th>
              <th className="py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.propertyId} className="border-b border-slate-100">
                <td className="py-2">{r.propertyName}</td>
                <td className="py-2">{formatMoney(r.laborCost)}</td>
                <td className="py-2">{formatMoney(r.materialsCost)}</td>
                <td className="py-2">{formatMoney(r.vendorCost)}</td>
                <td className="py-2">{formatMoney(r.otherCost)}</td>
                <td className="py-2 font-medium">{formatMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function MaintenanceDetailTable({ rows }: { rows: MaintenanceRow[] }) {
  return (
    <Card title="Maintenance cost detail">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Property</th>
              <th className="py-2">Work order</th>
              <th className="py-2">Category</th>
              <th className="py-2">Description</th>
              <th className="py-2">Hours</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.propertyId}-${r.category}-${idx}`} className="border-b border-slate-100">
                <td className="py-2">{r.propertyName}</td>
                <td className="py-2">{r.workOrderNumber ?? "—"}</td>
                <td className="py-2 capitalize">{r.category}</td>
                <td className="py-2">
                  {r.description}
                  {r.employeeName ? ` · ${r.employeeName}` : ""}
                </td>
                <td className="py-2">{r.hours != null ? r.hours.toFixed(1) : "—"}</td>
                <td className="py-2">{formatMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function LaborTable({ rows }: { rows: LaborRow[] }) {
  return (
    <Card title="Employee labor">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Employee</th>
              <th className="py-2">Date</th>
              <th className="py-2">Property</th>
              <th className="py-2">Work order</th>
              <th className="py-2">Hours</th>
              <th className="py-2">Rate</th>
              <th className="py-2">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.entryId} className="border-b border-slate-100">
                <td className="py-2">{r.employeeName}</td>
                <td className="py-2">{r.workDate}</td>
                <td className="py-2">{r.propertyName}</td>
                <td className="py-2">{r.workOrderNumber ?? "—"}</td>
                <td className="py-2">{r.hours.toFixed(1)}</td>
                <td className="py-2">{formatMoney(r.hourlyRate)}</td>
                <td className="py-2">{formatMoney(r.laborCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ExpenseBreakdownTable({
  rows,
  mode,
}: {
  rows: ExpenseBreakdownRow[];
  mode: ReportMode;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Card
      title={
        mode === "summary"
          ? `Expense breakdown (summary) · ${ALL_PERIODS_HINT}`
          : `Expense breakdown by category · ${ALL_PERIODS_HINT}`
      }
    >
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li
            key={r.category}
            className="flex items-center justify-between border-b border-slate-50 py-2"
          >
            <span className="capitalize">{r.category}</span>
            <span>
              {formatMoney(r.amount)}
              {total > 0 ? (
                <span className="ml-2 text-xs text-slate-500">
                  ({((r.amount / total) * 100).toFixed(1)}%)
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-medium">Total {formatMoney(total)}</p>
    </Card>
  );
}

export function ReportHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">{title}</h1>
      <p className="mt-1 max-w-3xl text-slate-600">{subtitle}</p>
    </div>
  );
}
