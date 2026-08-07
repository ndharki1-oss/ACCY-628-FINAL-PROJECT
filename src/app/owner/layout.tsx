import { OwnerAppShell } from "@/components/owner-app-shell";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { fetchOwnerMyItems } from "@/lib/owner/my-items";
import { formatMoney } from "@/lib/utils";
import type {
  OwnerContactMessageHint,
  OwnerItemHint,
} from "@/lib/owner-notifications-store";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["owner"]);
  const { ownerId } = await getLinkedOwnerId(supabase, user);
  const items = ownerId ? await fetchOwnerMyItems(supabase, ownerId) : null;
  const attentionCount = items?.attentionCount ?? 0;

  const itemHints: OwnerItemHint[] = [];
  if (items) {
    for (const c of items.costs.filter((x) => x.overThreshold)) {
      itemHints.push({
        id: c.id,
        kind: "cost",
        title: "Cost awaiting your approval",
        preview: `${c.description} at ${c.property_name} · ${formatMoney(c.amount)}`,
      });
    }
    for (const w of items.workOrders) {
      itemHints.push({
        id: w.id,
        kind: "work-order",
        title: "Work order needs your decision",
        preview: `${w.wo_number}: ${w.title} · ${w.property_name}`,
      });
    }
    for (const inv of items.overdueInvoices) {
      itemHints.push({
        id: inv.id,
        kind: "overdue",
        title: "Overdue rent",
        preview: `${inv.tenant_name} at ${inv.property_name} · ${formatMoney(inv.balance)} due ${inv.due_date}`,
      });
    }
    for (const e of items.expirations.filter((x) => x.window === "12 months")) {
      itemHints.push({
        id: e.id,
        kind: "expiration",
        title: "Lease expiring within 12 months",
        preview: `${e.tenant_name} at ${e.property_name} ends ${e.end_date}`,
      });
    }
  }

  let contactMessages: OwnerContactMessageHint[] = [];
  if (ownerId) {
    const { data: managerMessages } = await supabase
      .from("owner_manager_messages")
      .select("id, sender_role, sender_name, body, created_at")
      .eq("owner_id", ownerId)
      .neq("sender_role", "owner")
      .order("created_at", { ascending: false })
      .limit(10);

    contactMessages = (managerMessages ?? [])
      .filter(
        (m) => m.sender_role === "admin" || m.sender_role === "system"
      )
      .map((m) => ({
        messageId: m.id,
        senderName: m.sender_name,
        senderRole: m.sender_role === "admin" ? "admin" : "system",
        preview: m.body,
        sentAt: new Date(m.created_at).toLocaleString(),
      }));
  }

  const ownerLinks = [
    { href: "/owner", label: "Dashboard" },
    { href: "/owner/properties", label: "Properties" },
    { href: "/owner/contracts", label: "Contracts" },
    { href: "/owner/items", label: "My Items", badge: attentionCount },
    { href: "/owner/statements", label: "Statements" },
    { href: "/owner/noi", label: "NOI" },
    { href: "/owner/contact", label: "Contact Management" },
  ];

  return (
    <OwnerAppShell
      name={profile.full_name}
      links={ownerLinks}
      itemHints={itemHints}
      contactMessages={contactMessages}
    >
      {children}
    </OwnerAppShell>
  );
}
