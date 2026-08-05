import { requireRole } from "@/lib/auth";
import { ReportHeading, PropertyPnLTable } from "@/components/reports/report-tables";
import { fetchPropertyPnL } from "@/lib/reports/data";

export default async function AdminPropertyPnLPage() {
  const { supabase } = await requireRole(["admin"]);
  const rows = await fetchPropertyPnL(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Property Profit & Loss"
        subtitle="Revenue and expenses for each managed property, including labor time costs."
      />
      <PropertyPnLTable rows={rows} mode="full" />
    </div>
  );
}
