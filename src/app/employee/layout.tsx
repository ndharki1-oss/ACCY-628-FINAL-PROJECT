import { EmployeeAppShell } from "@/components/employee-app-shell";
import { requireRole } from "@/lib/auth";
import { getLinkedVendorId } from "@/lib/portal";
import { employeeCanWorkStatus } from "@/lib/work-order-routing";
import type { AssignmentHint } from "@/lib/employee-notifications-store";

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
  const { vendorId, vendor } = await getLinkedVendorId(supabase, user);
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

  let assignmentHints: AssignmentHint[] = [];
  if (vendorId) {
    const { data: wos } = await supabase
      .from("work_orders")
      .select("id, wo_number, title, status, scheduled_date, properties(name)")
      .eq("vendor_id", vendorId)
      .order("scheduled_date", { ascending: false })
      .limit(20);

    assignmentHints = (wos ?? [])
      .filter((w) => employeeCanWorkStatus(w.status))
      .slice(0, 8)
      .map((w) => {
        const prop = Array.isArray(w.properties) ? w.properties[0] : w.properties;
        return {
          id: w.id,
          woNumber: w.wo_number,
          title: w.title,
          propertyName: prop?.name ?? "Property",
          status: w.status,
          scheduledDate: w.scheduled_date,
        };
      });
  }

  return (
    <EmployeeAppShell
      name={profile.full_name}
      links={links}
      demoRole={demoRole}
      assignmentHints={assignmentHints}
    >
      {children}
    </EmployeeAppShell>
  );
}
