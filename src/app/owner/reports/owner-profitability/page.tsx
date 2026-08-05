import { requireRole } from "@/lib/auth";
import { ReportHeading, OwnerProfitTable } from "@/components/reports/report-tables";
import { fetchOwnerProfitability } from "@/lib/reports/data";
import { ownerPropertyIds } from "@/lib/reports/scope";

export default async function OwnerOwnerProfitabilityPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const propertyIds = await ownerPropertyIds(supabase, user.id);
  const rows = await fetchOwnerProfitability(supabase, {
    mode: "full",
    propertyIds,
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Your Owner Profitability"
        subtitle="Profit across the properties you own (owner economics, not Harborline company P&L)."
      />
      <OwnerProfitTable rows={rows} />
    </div>
  );
}
