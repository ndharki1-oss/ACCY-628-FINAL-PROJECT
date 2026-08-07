import { PageHeading } from "@/components/page-heading";
import { PortalSettingsForm } from "@/components/settings/portal-settings-form";
import type { PortalRole } from "@/lib/help/faq-data";

const LANDING: Record<PortalRole, { value: string; label: string }[]> = {
  owner: [
    { value: "/owner", label: "Dashboard" },
    { value: "/owner/items", label: "My Items" },
    { value: "/owner/statements", label: "Statements" },
    { value: "/owner/noi", label: "NOI" },
  ],
  admin: [
    { value: "/admin", label: "Dashboard" },
    { value: "/admin/work-orders", label: "Work Orders" },
    { value: "/admin/messages", label: "Messages" },
    { value: "/admin/billing", label: "Billing" },
  ],
  tenant: [
    { value: "/tenant", label: "Home" },
    { value: "/tenant/invoices", label: "Invoices" },
    { value: "/tenant/requests", label: "Requests" },
    { value: "/tenant/lease", label: "Lease" },
  ],
  employee: [
    { value: "/employee", label: "Workspace" },
    { value: "/employee/work-orders", label: "Assignments" },
  ],
  accounting: [
    { value: "/accounting", label: "Dashboard" },
    { value: "/accounting/profitability", label: "Profitability" },
  ],
};

export function RoleSettingsPage({
  role,
  title,
}: {
  role: PortalRole;
  title: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeading
        title={title}
        info="Browser preferences for this portal. They do not change shared Harborline data."
      />
      <PortalSettingsForm role={role} landingOptions={LANDING[role]} />
    </div>
  );
}
