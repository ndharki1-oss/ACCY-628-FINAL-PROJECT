import {
  AccountingAppShell,
  type AccountingNavItem,
} from "@/components/accounting-app-shell";
import { requireExactRole } from "@/lib/auth";

const accountingLinks: AccountingNavItem[] = [
  { href: "/accounting", label: "Dashboard" },
  { href: "/accounting/statements", label: "Statements" },
  { href: "/accounting/profitability", label: "Profitability" },
  {
    label: "Owner Expenses",
    children: [
      {
        href: "/accounting/reports/maintenance",
        label: "Maintenance",
      },
      {
        href: "/accounting/reports/employee-labor",
        label: "Labor",
      },
      {
        href: "/accounting/reports/expense-breakdown",
        label: "Expenses",
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
