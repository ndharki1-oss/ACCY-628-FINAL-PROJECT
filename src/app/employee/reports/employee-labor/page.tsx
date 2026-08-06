import { requireRole } from "@/lib/auth";
import { LaborTable, ReportHeading } from "@/components/reports/report-tables";
import { fetchEmployeeLabor } from "@/lib/reports/data";

export default async function EmployeeLaborReportPage() {
  const { supabase, user } = await requireRole(["vendor"]);
  const rows = await fetchEmployeeLabor(supabase, {
    mode: "self",
    profileId: user.id,
  });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="My Labor Report"
        info="Hours and labor cost for work orders assigned to you (synced to your login)."
      />
      <LaborTable rows={rows} />
    </div>
  );
}
