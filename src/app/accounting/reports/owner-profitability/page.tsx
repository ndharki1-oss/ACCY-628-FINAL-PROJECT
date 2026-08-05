import { requireExactRole } from "@/lib/auth";
import { ReportHeading, OwnerProfitTable } from "@/components/reports/report-tables";
import { fetchOwnerProfitability } from "@/lib/reports/data";

export default async function AccountingOwnerProfitabilityPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const rows = await fetchOwnerProfitability(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Owner (Customer) Profitability"
        subtitle="Profit generated from each property owner across all managed properties."
      />
      <OwnerProfitTable rows={rows} />
    </div>
  );
}
