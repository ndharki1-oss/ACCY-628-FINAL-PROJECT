import { requireRole } from "@/lib/auth";
import { ReportHeading, PropertyPnLTable } from "@/components/reports/report-tables";
import {
  fetchPropertyPnL,
  fetchPropertyPnLChartActivity,
} from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AdminPropertyPnLPage() {
  const { supabase } = await requireRole(["admin"]);
  const [rows, chartActivity] = await Promise.all([
    fetchPropertyPnL(supabase, { mode: "full" }),
    fetchPropertyPnLChartActivity(supabase, { mode: "full" }),
  ]);
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Property Profit & Loss"
        subtitle={`${ALL_PERIODS_HINT}. NOI = tenant revenue − cost_entries. Harborline labor is shown separately and is not in NOI.`}
      />
      <PropertyPnLTable
        rows={rows}
        mode="full"
        showChart
        chartActivity={chartActivity}
      />
    </div>
  );
}
