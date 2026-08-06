import { requireRole } from "@/lib/auth";
import { LaborTable, ReportHeading } from "@/components/reports/report-tables";
import { fetchEmployeeLabor } from "@/lib/reports/data";

export default async function AdminEmployeeLaborPage() {
  const { supabase } = await requireRole(["admin"]);
  const rows = await fetchEmployeeLabor(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Employee Labor Report"
        info="Labor hours and costs by employee, property, and work order."
      />
      <LaborTable rows={rows} />
    </div>
  );
}
