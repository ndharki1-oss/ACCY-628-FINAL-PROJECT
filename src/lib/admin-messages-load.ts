import type { SupabaseClient } from "@supabase/supabase-js";
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

export async function loadAdminTenantMessageThreads(
  supabase: SupabaseClient
): Promise<AdminConversationThread[]> {
  const [{ data: tenantMessages }, { data: leases }, { data: requests }] =
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
      partyId: string;
      partyName: string;
      partyContact: string | null;
      partyEmail: string | null;
      partyPhone: string | null;
      messages: AdminThreadMessage[];
    }
  >();

  for (const msg of tenantMessages ?? []) {
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
      partyId: msg.tenant_id,
      partyName:
        tenant?.company_name ??
        tenant?.contact_name ??
        msg.sender_name ??
        "Tenant",
      partyContact: tenant?.contact_name ?? null,
      partyEmail: tenant?.email ?? null,
      partyPhone: tenant?.phone ?? null,
      messages: [threadMessage],
    });
  }

  return sortAdminConversationThreads(
    [...byTenant.values()]
      .filter((group) => group.messages.some((m) => m.senderRole === "tenant"))
      .map((group) => {
        const lease = leaseByTenant.get(group.partyId);
        const request = requestByTenant.get(group.partyId);
        const partyMessages = group.messages.filter(
          (m) => m.senderRole === "tenant"
        );
        const unread = partyMessages.filter((m) => !m.isRead);
        const latestParty =
          unread[unread.length - 1] ??
          partyMessages[partyMessages.length - 1] ??
          group.messages[group.messages.length - 1];
        const latestOverall = group.messages[group.messages.length - 1];
        const previewSource = latestParty ?? latestOverall;

        return {
          channel: "tenant" as const,
          partyId: group.partyId,
          partyName: group.partyName,
          partyContact: group.partyContact,
          partyEmail: group.partyEmail,
          partyPhone: group.partyPhone,
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
          unreadCount: unread.length,
          isRead: unread.length === 0,
          isUrgent: unread.some((m) => m.isUrgent),
          messageCount: group.messages.length,
        };
      })
  );
}

export async function loadAdminOwnerMessageThreads(
  supabase: SupabaseClient
): Promise<AdminConversationThread[]> {
  const [{ data: ownerMessages }, { data: properties }] = await Promise.all([
    supabase
      .from("owner_manager_messages")
      .select(
        "id, owner_id, sender_role, sender_name, body, created_at, admin_read_at, owners(id, company_name, contact_name, email, phone)"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("properties")
      .select("id, name, owner_id")
      .eq("status", "active"),
  ]);

  const propertyByOwner = new Map<
    string,
    { propertyId: string; propertyName: string; count: number }
  >();
  for (const property of properties ?? []) {
    if (!property.owner_id) continue;
    const existing = propertyByOwner.get(property.owner_id);
    if (!existing) {
      propertyByOwner.set(property.owner_id, {
        propertyId: property.id,
        propertyName: property.name,
        count: 1,
      });
      continue;
    }
    existing.count += 1;
  }

  const byOwner = new Map<
    string,
    {
      partyId: string;
      partyName: string;
      partyContact: string | null;
      partyEmail: string | null;
      partyPhone: string | null;
      messages: AdminThreadMessage[];
    }
  >();

  for (const msg of ownerMessages ?? []) {
    const owner = firstRelation(msg.owners);
    const existing = byOwner.get(msg.owner_id);
    const threadMessage: AdminThreadMessage = {
      id: msg.id,
      senderRole: msg.sender_role,
      senderName: msg.sender_name,
      body: msg.body ?? "",
      createdAt: msg.created_at,
      adminReadAt: msg.admin_read_at ?? null,
      isRead: msg.sender_role !== "owner" ? true : Boolean(msg.admin_read_at),
      isUrgent:
        msg.sender_role === "owner"
          ? isUrgentMessageBody(msg.body ?? "")
          : false,
    };

    if (existing) {
      existing.messages.push(threadMessage);
      continue;
    }

    byOwner.set(msg.owner_id, {
      partyId: msg.owner_id,
      partyName:
        owner?.company_name ??
        owner?.contact_name ??
        msg.sender_name ??
        "Owner",
      partyContact: owner?.contact_name ?? null,
      partyEmail: owner?.email ?? null,
      partyPhone: owner?.phone ?? null,
      messages: [threadMessage],
    });
  }

  return sortAdminConversationThreads(
    [...byOwner.values()]
      .filter((group) => group.messages.some((m) => m.senderRole === "owner"))
      .map((group) => {
        const property = propertyByOwner.get(group.partyId);
        const partyMessages = group.messages.filter(
          (m) => m.senderRole === "owner"
        );
        const unread = partyMessages.filter((m) => !m.isRead);
        const latestParty =
          unread[unread.length - 1] ??
          partyMessages[partyMessages.length - 1] ??
          group.messages[group.messages.length - 1];
        const latestOverall = group.messages[group.messages.length - 1];
        const previewSource = latestParty ?? latestOverall;
        const propertyName = property
          ? property.count > 1
            ? `${property.propertyName} (+${property.count - 1} more)`
            : property.propertyName
          : null;

        return {
          channel: "owner" as const,
          partyId: group.partyId,
          partyName: group.partyName,
          partyContact: group.partyContact,
          partyEmail: group.partyEmail,
          partyPhone: group.partyPhone,
          propertyId: property?.propertyId ?? null,
          propertyName,
          unitCode: null,
          leaseId: null,
          leaseNumber: null,
          relatedRequestId: null,
          relatedRequestTitle: null,
          messages: group.messages,
          latestAt: latestOverall?.createdAt ?? group.messages[0].createdAt,
          preview: messagePreview(previewSource?.body ?? ""),
          subject: messageSubject(previewSource?.body ?? "Conversation"),
          unreadCount: unread.length,
          isRead: unread.length === 0,
          isUrgent: unread.some((m) => m.isUrgent),
          messageCount: group.messages.length,
        };
      })
  );
}
