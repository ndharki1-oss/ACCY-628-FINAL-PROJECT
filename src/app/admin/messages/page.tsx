import { requireRole } from "@/lib/auth";
import { AdminMessagesInbox } from "@/components/admin-messages-inbox";
import {
  isUrgentMessageBody,
  messagePreview,
  messageSubject,
  sortAdminConversationThreads,
  type AdminConversationThread,
  type AdminThreadMessage,
} from "@/lib/admin-messages";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminMessagesPage() {
  const { supabase } = await requireRole(["admin"]);

  const [{ data: messages }, { data: leases }, { data: requests }] =
    await Promise.all([
      supabase
        .from("tenant_manager_messages")
        .select(
          "id, tenant_id, sender_role, sender_name, body, created_at, admin_read_at, tenants(id, company_name, contact_name, email, phone)"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("leases")
        .select(
          "id, lease_number, tenant_id, property_id, unit_id, status, properties(id, name), units(unit_code)"
        )
        .in("status", ["active", "renewal_pending"]),
      supabase
        .from("tenant_requests")
        .select("id, tenant_id, title, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ]);

  const leaseByTenant = new Map<
    string,
    {
      leaseId: string;
      leaseNumber: string;
      propertyId: string | null;
      propertyName: string | null;
      unitCode: string | null;
    }
  >();

  for (const lease of leases ?? []) {
    if (leaseByTenant.has(lease.tenant_id)) continue;
    const property = firstRelation(lease.properties);
    const unit = firstRelation(lease.units);
    leaseByTenant.set(lease.tenant_id, {
      leaseId: lease.id,
      leaseNumber: lease.lease_number,
      propertyId: property?.id ?? lease.property_id ?? null,
      propertyName: property?.name ?? null,
      unitCode: unit?.unit_code ?? null,
    });
  }

  const requestByTenant = new Map<string, { id: string; title: string }>();
  for (const req of requests ?? []) {
    if (requestByTenant.has(req.tenant_id)) continue;
    requestByTenant.set(req.tenant_id, { id: req.id, title: req.title });
  }

  const byTenant = new Map<
    string,
    {
      tenantId: string;
      tenantName: string;
      tenantContact: string | null;
      tenantEmail: string | null;
      tenantPhone: string | null;
      messages: AdminThreadMessage[];
    }
  >();

  for (const msg of messages ?? []) {
    const tenant = firstRelation(msg.tenants);
    const existing = byTenant.get(msg.tenant_id);
    const threadMessage: AdminThreadMessage = {
      id: msg.id,
      senderRole: msg.sender_role,
      senderName: msg.sender_name,
      body: msg.body ?? "",
      createdAt: msg.created_at,
      adminReadAt: msg.admin_read_at ?? null,
      isRead:
        msg.sender_role !== "tenant" ? true : Boolean(msg.admin_read_at),
      isUrgent:
        msg.sender_role === "tenant"
          ? isUrgentMessageBody(msg.body ?? "")
          : false,
    };

    if (existing) {
      existing.messages.push(threadMessage);
      continue;
    }

    byTenant.set(msg.tenant_id, {
      tenantId: msg.tenant_id,
      tenantName:
        tenant?.company_name ??
        tenant?.contact_name ??
        msg.sender_name ??
        "Tenant",
      tenantContact: tenant?.contact_name ?? null,
      tenantEmail: tenant?.email ?? null,
      tenantPhone: tenant?.phone ?? null,
      messages: [threadMessage],
    });
  }

  const threads: AdminConversationThread[] = sortAdminConversationThreads(
    [...byTenant.values()]
      .filter((group) =>
        group.messages.some((m) => m.senderRole === "tenant")
      )
      .map((group) => {
        const lease = leaseByTenant.get(group.tenantId);
        const request = requestByTenant.get(group.tenantId);
        const tenantMessages = group.messages.filter(
          (m) => m.senderRole === "tenant"
        );
        const unreadTenant = tenantMessages.filter((m) => !m.isRead);
        const latestTenant =
          unreadTenant[unreadTenant.length - 1] ??
          tenantMessages[tenantMessages.length - 1] ??
          group.messages[group.messages.length - 1];
        const latestOverall = group.messages[group.messages.length - 1];
        const previewSource = latestTenant ?? latestOverall;

        return {
          tenantId: group.tenantId,
          tenantName: group.tenantName,
          tenantContact: group.tenantContact,
          tenantEmail: group.tenantEmail,
          tenantPhone: group.tenantPhone,
          propertyId: lease?.propertyId ?? null,
          propertyName: lease?.propertyName ?? null,
          unitCode: lease?.unitCode ?? null,
          leaseId: lease?.leaseId ?? null,
          leaseNumber: lease?.leaseNumber ?? null,
          relatedRequestId: request?.id ?? null,
          relatedRequestTitle: request?.title ?? null,
          messages: group.messages,
          latestAt: latestOverall?.createdAt ?? group.messages[0].createdAt,
          preview: messagePreview(previewSource?.body ?? ""),
          subject: messageSubject(previewSource?.body ?? "Conversation"),
          unreadCount: unreadTenant.length,
          isRead: unreadTenant.length === 0,
          isUrgent: unreadTenant.some((m) => m.isUrgent),
          messageCount: group.messages.length,
        };
      })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#0c1f2e]">
          Messages
        </h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          One conversation thread per tenant from Contact Management. Open a
          thread to review the full history and reply.
        </p>
      </div>

      <AdminMessagesInbox threads={threads} />
    </div>
  );
}
