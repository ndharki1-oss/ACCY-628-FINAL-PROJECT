import { requireRole } from "@/lib/auth";
import { RoleHelpPage } from "@/components/help/role-help-page";

export default async function OwnerHelpPage() {
  await requireRole(["owner"]);
  return <RoleHelpPage role="owner" />;
}
