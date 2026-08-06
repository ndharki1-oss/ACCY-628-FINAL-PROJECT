import {
  AdminAppShell,
  type AdminNavItem,
} from "@/components/admin-app-shell";
import type { AdminMessageBellItem } from "@/components/admin-message-notifications";
import { requireRole } from "@/lib/auth";
import {
  isUrgentMessageBody,
  messagePreview,
} from "@/lib/admin-messages";

const adminLinks: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  {
    label: "Portfolio",
    children: [
      { href: "/admin/properties", label: "Properties" },
      { href: "/admin/owners", label: "Property Owners" },
      { href: "/admin/leases", label: "Leases" },
    ],
  },
  {
    label: "Contracts",
    children: [
      { href: "/admin/contracts/owners", label: "Owners" },
      { href: "/admin/contracts/tenants", label: "Tenants" },
    ],
  },
  { href: "/admin/messages", label: "Messages" },
  {
    label: "Billing",
    children: [
      { href: "/admin/billing", label: "Billing" },
      { href: "/admin/statements", label: "Statements" },
    ],
  },
  { href: "/admin/work-orders", label: "Work Orders" },
  {
    label: "Profitability",
    children: [
      { href: "/admin/profitability", label: "Mgmt P&L" },
      { href: "/admin/reports/property-pnl", label: "Property P&L" },
      {
        href: "/admin/reports/owner-profitability",
        label: "Owner Profit",
      },
    ],
  },
  {
    label: "Expenses",
    children: [
      { href: "/admin/reports/maintenance", label: "Maintenance" },
      { href: "/admin/reports/employee-labor", label: "Labor" },
      { href: "/admin/reports/expense-breakdown", label: "Expenses" },
    ],
  },
];

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile } = await requireRole(["admin"]);

  const { data: unreadMessages } = await supabase
    .from("tenant_manager_messages")
    .select(
      "id, body, created_at, sender_name, tenants(company_name, contact_name)"
    )
    .eq("sender_role", "tenant")
    .is("admin_read_at", null)
    .order("created_at", { ascending: false })
    .limit(8);

  const recentUnread: AdminMessageBellItem[] = (unreadMessages ?? []).map(
    (msg) => {
      const tenant = firstRelation(msg.tenants);
      return {
        id: msg.id,
        tenantName:
          tenant?.company_name ??
          tenant?.contact_name ??
          msg.sender_name ??
          "Tenant",
        preview: messagePreview(msg.body ?? "", 90),
        createdAt: msg.created_at,
        isUrgent: isUrgentMessageBody(msg.body ?? ""),
      };
    }
  );

  const unreadCountResult = await supabase
    .from("tenant_manager_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_role", "tenant")
    .is("admin_read_at", null);

  return (
    <AdminAppShell
      name={profile.full_name}
      links={adminLinks}
      unreadMessageCount={unreadCountResult.count ?? recentUnread.length}
      recentUnreadMessages={recentUnread}
    >
      {children}
    </AdminAppShell>
  );
}
