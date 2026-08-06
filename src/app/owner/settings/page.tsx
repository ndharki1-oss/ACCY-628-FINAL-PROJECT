import { requireRole } from "@/lib/auth";
import { RoleSettingsPage } from "@/components/settings/role-settings-page";

export default async function OwnerSettingsPage() {
  await requireRole(["owner"]);
  return <RoleSettingsPage role="owner" title="Owner Settings" />;
}
