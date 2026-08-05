import { requireRole } from "@/lib/auth";
import {
  MaintenanceDetailTable,
  ReportHeading,
} from "@/components/reports/report-tables";
import { fetchMaintenanceReport } from "@/lib/reports/data";

export default async function EmployeeMaintenanceReportPage() {
  const { supabase, user } = await requireRole(["vendor"]);
  const { detail } = await fetchMaintenanceReport(supabase, {
    mode: "self",
    profileId: user.id,
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="My Maintenance Hours"
        subtitle="Your labor hours and costs only — not company-wide maintenance spend."
      />
      <MaintenanceDetailTable rows={detail} />
    </div>
  );
}
