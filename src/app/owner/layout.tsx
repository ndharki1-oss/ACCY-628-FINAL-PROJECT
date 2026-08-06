import { OwnerAppShell } from "@/components/owner-app-shell";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { fetchOwnerAttentionCount } from "@/lib/owner/my-items";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["owner"]);
  const { ownerId } = await getLinkedOwnerId(supabase, user);
  const attentionCount = ownerId
    ? await fetchOwnerAttentionCount(supabase, ownerId)
    : 0;

  const ownerLinks = [
    { href: "/owner", label: "Dashboard" },
    { href: "/owner/properties", label: "Properties" },
    { href: "/owner/items", label: "My Items", badge: attentionCount },
    { href: "/owner/statements", label: "Statements" },
    { href: "/owner/noi", label: "NOI" },
    { href: "/owner/contact", label: "Contact Management" },
  ];

  return (
    <OwnerAppShell name={profile.full_name} links={ownerLinks}>
      {children}
    </OwnerAppShell>
  );
}
