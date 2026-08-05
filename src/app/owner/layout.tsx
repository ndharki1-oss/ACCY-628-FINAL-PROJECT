import { OwnerAppShell } from "@/components/owner-app-shell";
import { requireRole } from "@/lib/auth";

/** Same owner tabs previously shown in the shared AppShell top nav. */
const ownerLinks = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/properties", label: "Properties" },
  { href: "/owner/approvals", label: "Approvals" },
  { href: "/owner/statements", label: "Statements" },
  { href: "/owner/noi", label: "NOI" },
  { href: "/owner/reports/property-pnl", label: "Property P&L" },
  { href: "/owner/reports/owner-profitability", label: "My Profitability" },
  { href: "/owner/reports/maintenance", label: "Maintenance" },
  { href: "/owner/reports/expense-breakdown", label: "Expenses" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["owner"]);

  return (
    <OwnerAppShell name={profile.full_name} links={ownerLinks}>
      {children}
    </OwnerAppShell>
  );
}
