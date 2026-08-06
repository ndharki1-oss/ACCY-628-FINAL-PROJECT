import { requireRole } from "@/lib/auth";
import { RoleSettingsPage } from "@/components/settings/role-settings-page";

export default async function AccountingSettingsPage() {
  await requireRole(["accounting"]);
  return <RoleSettingsPage role="accounting" title="Accounting Settings" />;
}
