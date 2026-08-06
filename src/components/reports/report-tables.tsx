import { Card } from "@/components/ui";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/utils";
import type {
  ExpenseBreakdownRow,
  ReportMode,
} from "@/lib/reports/types";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export {
  PropertyPnLTable,
  OwnerProfitTable,
} from "@/components/reports/filterable-pnl-tables";

export {
  MaintenanceSummaryTable,
  MaintenanceDetailTable,
  LaborTable,
} from "@/components/reports/filterable-expense-tables";

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
  info,
}: {
  title: string;
  /** Visible status/period line (optional) */
  subtitle?: string;
  /** Helpful definition — shown via circled i */
  info?: string;
}) {
  return <PageHeading title={title} vital={subtitle} info={info} />;
}
