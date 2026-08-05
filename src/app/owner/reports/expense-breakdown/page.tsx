import { requireRole } from "@/lib/auth";
import {
  ExpenseBreakdownTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchExpenseBreakdown } from "@/lib/reports/data";
import { ownerPropertyIds } from "@/lib/reports/scope";

export default async function OwnerExpenseBreakdownPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const propertyIds = await ownerPropertyIds(supabase, user.id);
  const rows = await fetchExpenseBreakdown(supabase, {
    mode: "summary",
    propertyIds,
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Expense Breakdown"
        subtitle="Summary expense categories for your properties only."
      />
      <ExpenseBreakdownTable rows={rows} mode="summary" />
    </div>
  );
}
