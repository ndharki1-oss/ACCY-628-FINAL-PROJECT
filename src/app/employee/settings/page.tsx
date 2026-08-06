import { requireRole } from "@/lib/auth";
import { RoleSettingsPage } from "@/components/settings/role-settings-page";

export default async function EmployeeSettingsPage() {
  await requireRole(["vendor"]);
  return <RoleSettingsPage role="employee" title="Employee Settings" />;
}
