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
  const isStaff =
    vendor?.worker_type === "staff" || profile.email === "staff@example.com";
  const isContractor =
    vendor?.worker_type === "contractor" ||
    profile.email === "employee@example.com";
  const demoRole = isStaff ? ("staff" as const) : ("vendor" as const);

  const links = isContractor
    ? employeeLinks.filter(
        (link) => link.href !== "/employee/independent-contractor"
      )
    : employeeLinks;

  return (
    <EmployeeAppShell name={profile.full_name} links={links} demoRole={demoRole}>
      {children}
    </EmployeeAppShell>
  );
}
