import { headers } from "next/headers";
import { TenantAppShell } from "@/components/tenant-app-shell";
import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import type {
  CheckoutLeaseHint,
  WaitingMessageHint,
} from "@/lib/tenant-notifications-store";

const tenantLinks = [
  { href: "/tenant", label: "Dashboard" },
  { href: "/tenant/lease", label: "My Leases" },
  { href: "/tenant/available", label: "Available Leases" },
  { href: "/tenant/invoices", label: "Payments" },
  { href: "/tenant/requests", label: "Maintenance Requests" },
  { href: "/tenant/contact", label: "Contact Management" },
];

function daysUntil(endDate: string) {
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["tenant"]);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isDocumentPopup =
    pathname.startsWith("/tenant/lease/view/") ||
    pathname.startsWith("/tenant/invoices/view/");

  if (isDocumentPopup) {
    return children;
  }

  const { tenantId } = await getLinkedTenantId(supabase, user);

  let checkoutLeases: CheckoutLeaseHint[] = [];
  let waitingMessage: WaitingMessageHint | null = null;

  if (tenantId) {
    const [{ data: leases }, { data: managerMessages }] = await Promise.all([
      supabase
        .from("leases")
        .select("id, lease_number, end_date, properties(name)")
        .eq("tenant_id", tenantId)
        .in("status", ["active", "renewal_pending"]),
      supabase
        .from("tenant_manager_messages")
        .select("id, sender_role, sender_name, body, created_at")
        .eq("tenant_id", tenantId)
        .neq("sender_role", "tenant")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    checkoutLeases = (leases ?? [])
      .map((lease) => {
        const daysLeft = daysUntil(lease.end_date);
        if (daysLeft == null || daysLeft < 0 || daysLeft > 7) return null;
        const prop = Array.isArray(lease.properties)
          ? lease.properties[0]
          : lease.properties;
        return {
          leaseId: lease.id,
          leaseNumber: lease.lease_number,
          endDate: lease.end_date,
          propertyName: prop?.name ?? "your property",
          daysLeft,
        } satisfies CheckoutLeaseHint;
      })
      .filter((x): x is CheckoutLeaseHint => x != null);

    const latest = managerMessages?.[0];
    if (
      latest &&
      (latest.sender_role === "admin" || latest.sender_role === "owner")
    ) {
      waitingMessage = {
        messageId: latest.id,
        senderName: latest.sender_name,
        senderRole: latest.sender_role,
        preview: latest.body,
        sentAt: new Date(latest.created_at).toLocaleString(),
      };
    }
  }

  return (
    <TenantAppShell
      name={profile.full_name}
      links={tenantLinks}
      checkoutLeases={checkoutLeases}
      waitingMessage={waitingMessage}
    >
      {children}
    </TenantAppShell>
  );
}
