import { requireRole } from "@/lib/auth";
import { ReportHeading, PropertyPnLTable } from "@/components/reports/report-tables";
import { fetchPropertyPnL } from "@/lib/reports/data";
import { ownerPropertyIds } from "@/lib/reports/scope";

export default async function OwnerPropertyPnLPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const propertyIds = await ownerPropertyIds(supabase, user.id);
  const rows = await fetchPropertyPnL(supabase, {
    mode: "summary",
    propertyIds,
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Property Profit & Loss"
        subtitle="Summary revenue and expenses for your properties only."
      />
      <PropertyPnLTable rows={rows} mode="summary" />
    </div>
  );
}
