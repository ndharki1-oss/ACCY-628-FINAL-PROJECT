import { EmployeeAppShell } from "@/components/employee-app-shell";
import { requireRole } from "@/lib/auth";
import { getLinkedVendorId } from "@/lib/portal";

const employeeLinks = [
  { href: "/employee", label: "Dashboard" },
  { href: "/employee/work-orders", label: "Assignments" },
  { href: "/employee/reports/employee-labor", label: "My Labor" },
  { href: "/employee/directory", label: "Employee Directory" },
  { href: "/employee/independent-contractor", label: "Independent Contractor" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["vendor"]);
  const { vendor } = await getLinkedVendorId(supabase, user);
  const demoRole =
    vendor?.worker_type === "staff" ||
    profile.email === "staff@example.com"
      ? ("staff" as const)
      : ("vendor" as const);

  return (
    <EmployeeAppShell
      name={profile.full_name}
      links={employeeLinks}
      demoRole={demoRole}
    >
      {children}
    </EmployeeAppShell>
  );
}
