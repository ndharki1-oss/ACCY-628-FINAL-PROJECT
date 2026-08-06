import { requireRole } from "@/lib/auth";
import { RoleHelpPage } from "@/components/help/role-help-page";

export default async function TenantHelpPage() {
  await requireRole(["tenant"]);
  return <RoleHelpPage role="tenant" />;
}
