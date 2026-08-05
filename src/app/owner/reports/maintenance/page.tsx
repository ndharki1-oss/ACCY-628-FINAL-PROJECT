import { requireRole } from "@/lib/auth";
import {
  MaintenanceSummaryTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchMaintenanceReport } from "@/lib/reports/data";
import { ownerPropertyIds } from "@/lib/reports/scope";

export default async function OwnerMaintenanceReportPage() {
  const { supabase, user } = await requireRole(["owner"]);
  const propertyIds = await ownerPropertyIds(supabase, user.id);
  const { summary } = await fetchMaintenanceReport(supabase, {
    mode: "summary",
    propertyIds,
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Maintenance Cost Report"
        subtitle="Summary maintenance costs for your properties (no employee-level detail)."
      />
      <MaintenanceSummaryTable rows={summary} />
    </div>
  );
}
