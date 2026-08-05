import { requireExactRole } from "@/lib/auth";
import { LaborTable, ReportHeading } from "@/components/reports/report-tables";
import { fetchEmployeeLabor } from "@/lib/reports/data";

export default async function AccountingEmployeeLaborPage() {
  const { supabase } = await requireExactRole(["accounting"]);
  const rows = await fetchEmployeeLabor(supabase, { mode: "full" });
  return (
    <div className="space-y-6">
      <ReportHeading
        title="Employee Labor Report"
        subtitle="Labor hours and costs by employee, property, and work order."
      />
      <LaborTable rows={rows} />
    </div>
  );
}
