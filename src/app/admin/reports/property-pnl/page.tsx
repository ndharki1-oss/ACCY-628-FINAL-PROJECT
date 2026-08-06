import { requireRole } from "@/lib/auth";
import { ReportHeading, PropertyPnLTable } from "@/components/reports/report-tables";
import { fetchPropertyPnL } from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AdminPropertyPnLPage() {
  const { supabase } = await requireRole(["admin"]);
  const rows = await fetchPropertyPnL(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Property Profit & Loss"
        subtitle={`${ALL_PERIODS_HINT}. NOI = tenant revenue − cost_entries. Harborline labor is shown separately and is not in NOI.`}
      />
      <PropertyPnLTable rows={rows} mode="full" />
    </div>
  );
}
