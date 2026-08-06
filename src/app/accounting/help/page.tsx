import { requireRole } from "@/lib/auth";
import { RoleHelpPage } from "@/components/help/role-help-page";

export default async function AccountingHelpPage() {
  await requireRole(["accounting"]);
  return <RoleHelpPage role="accounting" />;
}
