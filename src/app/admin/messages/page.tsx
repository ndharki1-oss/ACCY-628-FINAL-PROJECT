import { requireRole } from "@/lib/auth";
import { AdminMessagesInbox } from "@/components/admin-messages-inbox";
import {
  loadAdminOwnerMessageThreads,
  loadAdminTenantMessageThreads,
} from "@/lib/admin-messages-load";
import type { AdminMessageChannel } from "@/lib/admin-messages";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel: rawChannel } = await searchParams;
  const channel: AdminMessageChannel =
    rawChannel === "owners" || rawChannel === "owner" ? "owner" : "tenant";

  const { supabase } = await requireRole(["admin"]);
  const threads =
    channel === "owner"
      ? await loadAdminOwnerMessageThreads(supabase)
      : await loadAdminTenantMessageThreads(supabase);

  const isOwner = channel === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
          Messages
        </h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          {isOwner
            ? "Property owner conversations from Contact Management. Open a thread to review history and reply."
            : "Tenant conversations from Contact Management. Open a thread to review history and reply."}
        </p>
      </div>

      <AdminMessagesInbox
        key={channel}
        channel={channel}
        threads={threads}
        title={isOwner ? "Owner inbox" : "Tenant inbox"}
        searchPlaceholder={
          isOwner
            ? "Search owner, property, subject, or message..."
            : "Search tenant, property, subject, or message..."
        }
        emptyLabel={
          isOwner
            ? "No owner conversations yet. Owners can message Harborline from Contact Management."
            : "No tenant conversations match this view."
        }
      />
    </div>
  );
}
