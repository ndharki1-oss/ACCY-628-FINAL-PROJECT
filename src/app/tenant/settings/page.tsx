import { requireRole } from "@/lib/auth";
import { RoleSettingsPage } from "@/components/settings/role-settings-page";

export default async function TenantSettingsPage() {
  await requireRole(["tenant"]);
  return <RoleSettingsPage role="tenant" title="Tenant Settings" />;
}
