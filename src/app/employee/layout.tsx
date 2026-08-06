import { EmployeeAppShell } from "@/components/employee-app-shell";
import { requireRole } from "@/lib/auth";

const employeeLinks = [
  { href: "/employee", label: "Dashboard" },
  { href: "/employee/work-orders", label: "Assignments" },
  { href: "/employee/reports/employee-labor", label: "My Labor" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["vendor"]);

  return (
    <EmployeeAppShell name={profile.full_name} links={employeeLinks}>
      {children}
    </EmployeeAppShell>
  );
}
