import { requireRole } from "@/lib/auth";
import {
  MaintenanceDetailTable,
  MaintenanceSummaryTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchMaintenanceReport } from "@/lib/reports/data";

export default async function AdminMaintenanceReportPage() {
  const { supabase } = await requireRole(["admin"]);
  const { detail, summary } = await fetchMaintenanceReport(supabase, {
    mode: "full",
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Maintenance Cost Report"
        subtitle="Labor hours, parts, and contractor costs by property and work order."
      />
      <MaintenanceSummaryTable rows={summary} />
      <MaintenanceDetailTable rows={detail} />
    </div>
  );
}
