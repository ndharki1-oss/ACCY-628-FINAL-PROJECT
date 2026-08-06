import { requireRole } from "@/lib/auth";
import { ReportHeading, OwnerProfitTable } from "@/components/reports/report-tables";
import {
  fetchOwnerProfitability,
  fetchPropertyPnLChartActivity,
} from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AdminOwnerProfitabilityPage() {
  const { supabase } = await requireRole(["admin"]);
  const [rows, chartActivity] = await Promise.all([
    fetchOwnerProfitability(supabase, { mode: "full" }),
    fetchPropertyPnLChartActivity(supabase, { mode: "full" }),
  ]);
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner (Customer) Profitability"
        subtitle={`${ALL_PERIODS_HINT}. Profit generated from each property owner across all managed properties.`}
      />
      <OwnerProfitTable rows={rows} showChart chartActivity={chartActivity} />
    </div>
  );
}
