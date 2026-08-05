import { AccountingAppShell } from "@/components/accounting-app-shell";
import { requireExactRole } from "@/lib/auth";

const accountingLinks = [
  { href: "/accounting", label: "Accounting" },
  { href: "/accounting/statements", label: "Statements" },
  { href: "/accounting/profitability", label: "Mgmt P&L" },
  { href: "/accounting/reports/property-pnl", label: "Property P&L" },
  { href: "/accounting/reports/owner-profitability", label: "Owner Profit" },
  { href: "/accounting/reports/maintenance", label: "Maintenance" },
  { href: "/accounting/reports/employee-labor", label: "Labor" },
  { href: "/accounting/reports/expense-breakdown", label: "Expenses" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireExactRole(["accounting"]);

  return (
    <AccountingAppShell name={profile.full_name} links={accountingLinks}>
      {children}
    </AccountingAppShell>
  );
}
