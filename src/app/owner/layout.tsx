import { OwnerAppShell } from "@/components/owner-app-shell";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { fetchOwnerMyItems } from "@/lib/owner/my-items";
import { formatMoney } from "@/lib/utils";
import type { OwnerItemHint } from "@/lib/owner-notifications-store";

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
    for (const c of items.costs.filter((x) => x.overThreshold).slice(0, 3)) {
      itemHints.push({
        id: c.id,
        kind: "cost",
        title: "Cost awaiting your approval",
        preview: `${c.description} at ${c.property_name} · ${formatMoney(c.amount)}`,
      });
    }
    for (const w of items.workOrders.slice(0, 3)) {
      itemHints.push({
        id: w.id,
        kind: "work-order",
        title: "Work order needs your decision",
        preview: `${w.wo_number}: ${w.title} · ${w.property_name}`,
      });
    }
    for (const r of items.requests.slice(0, 2)) {
      itemHints.push({
        id: r.id,
        kind: "request",
        title: "Open tenant request",
        preview: `${r.title} · ${r.tenant_name} at ${r.property_name}`,
      });
    }
    for (const inv of items.overdueInvoices.slice(0, 2)) {
      itemHints.push({
        id: inv.id,
        kind: "overdue",
        title: "Overdue rent",
        preview: `${inv.tenant_name} at ${inv.property_name} · ${formatMoney(inv.balance)} due ${inv.due_date}`,
      });
    }
    for (const e of items.expirations
      .filter((x) => x.window === "12 months")
      .slice(0, 2)) {
      itemHints.push({
        id: e.id,
        kind: "expiration",
        title: "Lease expiring within 12 months",
        preview: `${e.tenant_name} at ${e.property_name} ends ${e.end_date}`,
      });
    }
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
    >
      {children}
    </OwnerAppShell>
  );
}
