export type AdminInboxFilter = "all" | "unread" | "read" | "urgent";

export type AdminThreadMessage = {
  id: string;
  senderRole: "tenant" | "admin" | "owner" | string;
  senderName: string;
  body: string;
  createdAt: string;
  adminReadAt: string | null;
  isRead: boolean;
  isUrgent: boolean;
};

export type AdminConversationThread = {
  tenantId: string;
  tenantName: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  propertyId: string | null;
  propertyName: string | null;
  unitCode: string | null;
  leaseId: string | null;
  leaseNumber: string | null;
  relatedRequestId: string | null;
  relatedRequestTitle: string | null;
  /** Chronological conversation (oldest → newest). */
  messages: AdminThreadMessage[];
  latestAt: string;
  preview: string;
  subject: string;
  unreadCount: number;
  isRead: boolean;
  isUrgent: boolean;
  messageCount: number;
};

const URGENT_PATTERN =
  /\b(urgent|emergency|asap|immediate|immediately|critical)\b/i;

export function isUrgentMessageBody(body: string) {
  return URGENT_PATTERN.test(body);
}

export function messageSubject(body: string) {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Message";
  if (isUrgentMessageBody(cleaned)) return "Urgent message";
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim() ?? cleaned;
  if (firstSentence.length <= 48) return firstSentence;
  return `${firstSentence.slice(0, 45).trimEnd()}…`;
}

export function messagePreview(body: string, max = 110) {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export function sortAdminConversationThreads(
  threads: AdminConversationThread[]
) {
  return [...threads].sort((a, b) => {
    const group = (t: AdminConversationThread) => {
      if (!t.isRead && t.isUrgent) return 0;
      if (!t.isRead) return 1;
      return 2;
    };
    const g = group(a) - group(b);
    if (g !== 0) return g;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });
}

export function filterAdminConversationThreads(
  threads: AdminConversationThread[],
  filter: AdminInboxFilter,
  query: string
) {
  const q = query.trim().toLowerCase();
  return threads.filter((thread) => {
    if (filter === "unread" && thread.isRead) return false;
    if (filter === "read" && !thread.isRead) return false;
    if (filter === "urgent" && !thread.isUrgent) return false;
    if (!q) return true;
    const haystack = [
      thread.tenantName,
      thread.tenantContact,
      thread.propertyName,
      thread.unitCode,
      thread.subject,
      thread.preview,
      ...thread.messages.map((m) => `${m.senderName} ${m.body}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function formatMessageDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function roleLabel(role: string) {
  if (role === "admin") return "Harborline management";
  if (role === "owner") return "Property owner";
  if (role === "tenant") return "Tenant";
  return role;
}
