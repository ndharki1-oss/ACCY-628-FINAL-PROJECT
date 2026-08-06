import { requireExactRole } from "@/lib/auth";
import {
  OwnerProfitTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchOwnerProfitability } from "@/lib/reports/data";
import { ALL_PERIODS_HINT } from "@/lib/reports/period-label";

export default async function AccountingOwnerProfitabilityPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const rows = await fetchOwnerProfitability(supabase, { mode: "full" });

  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner Profitability"
        subtitle={ALL_PERIODS_HINT}
        info="Profit generated from each property owner across all managed properties."
      />
      <OwnerProfitTable rows={rows} enableExcelExport />
    </div>
  );
}
