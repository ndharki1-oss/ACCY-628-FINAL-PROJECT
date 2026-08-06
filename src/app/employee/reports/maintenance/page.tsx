import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/** Legacy My Hours URL — same labor data as My Labor. */
export default async function EmployeeMaintenanceReportPage() {
  await requireRole(["vendor"]);
  redirect("/employee/reports/employee-labor");
}
