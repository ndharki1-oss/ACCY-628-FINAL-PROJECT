import { requireExactRole } from "@/lib/auth";
import {
  PropertyPnLTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchPropertyPnL } from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AccountingPropertyPnLPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const rows = await fetchPropertyPnL(supabase, { mode: "full" });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Property Profit & Loss"
        subtitle={ALL_PERIODS_HINT}
        info="NOI = tenant revenue − cost_entries. Harborline labor is shown separately and is not in NOI."
      />
      <PropertyPnLTable rows={rows} mode="full" enableExcelExport />
    </div>
  );
}
