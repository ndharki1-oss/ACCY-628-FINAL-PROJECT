import { requireRole } from "@/lib/auth";
import { RoleHelpPage } from "@/components/help/role-help-page";

export default async function EmployeeHelpPage() {
  await requireRole(["vendor"]);
  return <RoleHelpPage role="employee" />;
}
