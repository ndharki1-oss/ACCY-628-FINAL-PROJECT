import { Suspense } from "react";
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
  { href: "/admin/contracts", label: "Contracts" },
  {
    label: "Contracts",
    children: [
      { href: "/admin/contracts/owners", label: "Owners" },
      { href: "/admin/contracts/tenants", label: "Tenants" },
    ],
  },
  {
    label: "Messages",
    children: [
      { href: "/admin/messages?channel=tenants", label: "Tenants" },
      { href: "/admin/messages?channel=owners", label: "Property Owners" },
    ],
  },
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

  const [
    { data: unreadTenantMessages },
    { data: unreadOwnerMessages },
    unreadTenantCountResult,
    unreadOwnerCountResult,
  ] = await Promise.all([
    supabase
      .from("tenant_manager_messages")
      .select(
        "id, body, created_at, sender_name, tenants(company_name, contact_name)"
      )
      .eq("sender_role", "tenant")
      .is("admin_read_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("owner_manager_messages")
      .select(
        "id, body, created_at, sender_name, owners(company_name, contact_name)"
      )
      .eq("sender_role", "owner")
      .is("admin_read_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tenant_manager_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "tenant")
      .is("admin_read_at", null),
    supabase
      .from("owner_manager_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "owner")
      .is("admin_read_at", null),
  ]);

  const tenantItems: AdminMessageBellItem[] = (unreadTenantMessages ?? []).map(
    (msg) => {
      const tenant = firstRelation(msg.tenants);
      return {
        id: msg.id,
        partyName:
          tenant?.company_name ??
          tenant?.contact_name ??
          msg.sender_name ??
          "Tenant",
        partyKind: "tenant" as const,
        preview: messagePreview(msg.body ?? "", 90),
        createdAt: msg.created_at,
        isUrgent: isUrgentMessageBody(msg.body ?? ""),
      };
    }
  );

  const ownerItems: AdminMessageBellItem[] = (unreadOwnerMessages ?? []).map(
    (msg) => {
      const owner = firstRelation(msg.owners);
      return {
        id: msg.id,
        partyName:
          owner?.company_name ??
          owner?.contact_name ??
          msg.sender_name ??
          "Owner",
        partyKind: "owner" as const,
        preview: messagePreview(msg.body ?? "", 90),
        createdAt: msg.created_at,
        isUrgent: isUrgentMessageBody(msg.body ?? ""),
      };
    }
  );

  const recentUnread = [...tenantItems, ...ownerItems]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8);

  const unreadCount =
    (unreadTenantCountResult.count ?? 0) + (unreadOwnerCountResult.count ?? 0);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef5_0%,_#f4f1ea_45%,_#ebe6dc_100%)]" />
      }
    >
      <AdminAppShell
        name={profile.full_name}
        links={adminLinks}
        unreadMessageCount={unreadCount}
        recentUnreadMessages={recentUnread}
      >
        {children}
      </AdminAppShell>
    </Suspense>
  );
}
