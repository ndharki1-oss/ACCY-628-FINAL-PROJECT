import { requireRole } from "@/lib/auth";
import { ReportHeading, OwnerProfitTable } from "@/components/reports/report-tables";
import { fetchOwnerProfitability } from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AdminOwnerProfitabilityPage() {
  const { supabase } = await requireRole(["admin"]);
  const rows = await fetchOwnerProfitability(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner (Customer) Profitability"
        subtitle={`${ALL_PERIODS_HINT}. Profit generated from each property owner across all managed properties. Charts live on the Admin Dashboard.`}
      />
      <OwnerProfitTable rows={rows} />
    </div>
  );
}
