import { requireRole } from "@/lib/auth";
import { RoleSettingsPage } from "@/components/settings/role-settings-page";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  return <RoleSettingsPage role="admin" title="Property Manager Settings" />;
}
