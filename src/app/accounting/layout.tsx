import {
  AccountingAppShell,
  type AccountingNavItem,
} from "@/components/accounting-app-shell";
import { requireExactRole } from "@/lib/auth";

const accountingLinks: AccountingNavItem[] = [
  { href: "/accounting/statements", label: "Statements" },
  {
    label: "Profitability",
    children: [
      { href: "/accounting/profitability", label: "Mgmt P&L" },
      { href: "/accounting/reports/property-pnl", label: "Property P&L" },
      {
        href: "/accounting/reports/owner-profitability",
        label: "Owner Profit",
      },
    ],
  },
  {
    label: "Owner Expenses",
    children: [
      {
        href: "/accounting/reports/maintenance",
        label: "Maintenance Breakdown",
      },
      {
        href: "/accounting/reports/employee-labor",
        label: "Labor Breakdown",
      },
      {
        href: "/accounting/reports/expense-breakdown",
        label: "Expenses Breakdown",
      },
    ],
  },
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
