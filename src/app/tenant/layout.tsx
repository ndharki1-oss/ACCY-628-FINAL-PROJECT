import { headers } from "next/headers";
import { TenantAppShell } from "@/components/tenant-app-shell";
import { requireRole } from "@/lib/auth";

const tenantLinks = [
  { href: "/tenant", label: "Dashboard" },
  { href: "/tenant/lease", label: "My Leases" },
  { href: "/tenant/available", label: "Available Leases" },
  { href: "/tenant/invoices", label: "Payments" },
  { href: "/tenant/requests", label: "Maintenance Requests" },
  { href: "/tenant/contact", label: "Contact Management" },
];

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["tenant"]);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isLeasePopup = pathname.startsWith("/tenant/lease/view/");

  if (isLeasePopup) {
    return children;
  }

  return (
    <TenantAppShell name={profile.full_name} links={tenantLinks}>
      {children}
    </TenantAppShell>
  );
}
