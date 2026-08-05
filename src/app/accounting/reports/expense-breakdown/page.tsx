import { requireExactRole } from "@/lib/auth";
import {
  ExpenseBreakdownTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchExpenseBreakdown } from "@/lib/reports/data";

export default async function AccountingExpenseBreakdownPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const rows = await fetchExpenseBreakdown(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Expense Breakdown"
        subtitle="Costs by category to identify the largest expense drivers."
      />
      <ExpenseBreakdownTable rows={rows} mode="full" />
    </div>
  );
}
