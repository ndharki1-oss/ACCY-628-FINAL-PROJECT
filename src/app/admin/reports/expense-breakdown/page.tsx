import { requireRole } from "@/lib/auth";
import {
  ExpenseBreakdownTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchExpenseBreakdown } from "@/lib/reports/data";

export default async function AdminExpenseBreakdownPage() {
  const { supabase } = await requireRole(["admin"]);
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
